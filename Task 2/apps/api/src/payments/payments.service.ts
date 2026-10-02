import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { config } from '../common/config';
import { MailService } from '../mail/mail.service';
import { emailData, OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

const PAYSTACK = 'https://api.paystack.co';

@Injectable()
export class PaymentsService {
  private logger = new Logger('Payments');

  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private mail: MailService,
  ) {}

  private get secret() {
    return process.env.PAYSTACK_SECRET_KEY || '';
  }
  /**
   * Simulated gateway (no real money). On only when no Paystack key is set AND either the app is not in
   * production or ALLOW_TEST_PAYMENTS=true is set explicitly. A real PAYSTACK_SECRET_KEY always wins.
   */
  get devGateway() {
    return !this.secret && (!config.isProd || process.env.ALLOW_TEST_PAYMENTS === 'true');
  }

  private async paystack(path: string, init?: RequestInit) {
    const res = await fetch(PAYSTACK + path, {
      ...init,
      headers: { Authorization: `Bearer ${this.secret}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
      signal: AbortSignal.timeout(15_000),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) throw new BadRequestException(json.message || 'Payment provider error');
    return json;
  }

  async initialize(orderNo: string, userId?: string, email?: string) {
    const order = await this.orders.getAuthorized(orderNo, userId, email);
    if (order.status !== 'PENDING_PAYMENT') {
      if (order.payments.some((p) => p.status === 'SUCCESS')) throw new ConflictException('This order has already been paid');
      throw new BadRequestException('This order can no longer be paid. Please place a new order.');
    }
    if (!this.secret && !this.devGateway) throw new ServiceUnavailableException('Payments are not configured');

    const reference = `MZ${Date.now()}${randomBytes(4).toString('hex')}`;
    await this.prisma.payment.create({
      data: { orderId: order.id, reference, amountMinor: order.totalMinor, currency: order.currency, provider: this.devGateway ? 'dev' : 'paystack' },
    });

    if (this.devGateway) {
      return { reference, authorizationUrl: `${config.webUrl}/checkout/mock-pay?reference=${reference}&order=${order.orderNumber}&email=${encodeURIComponent(order.email)}` };
    }
    const json = await this.paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: order.email,
        amount: order.totalMinor,
        currency: order.currency,
        reference,
        callback_url: `${config.webUrl}/order/${order.orderNumber}?email=${encodeURIComponent(order.email)}&reference=${reference}`,
        metadata: { orderNumber: order.orderNumber },
      }),
    });
    return { reference, authorizationUrl: json.data.authorization_url as string };
  }

  /** Asks Paystack for the truth about a reference; never trusts the browser or the webhook body alone. */
  async verify(reference: string) {
    const payment = await this.prisma.payment.findUnique({ where: { reference }, include: { order: true } });
    if (!payment) throw new NotFoundException('Unknown payment reference');
    if (payment.status === 'SUCCESS') return { status: 'SUCCESS' as const, orderNumber: payment.order.orderNumber };
    if (this.devGateway) return { status: payment.status, orderNumber: payment.order.orderNumber };

    const json = await this.paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    const d = json.data;
    if (d.status === 'success') {
      if (d.amount !== payment.amountMinor || String(d.currency).toUpperCase() !== payment.currency.toUpperCase())
        throw new BadRequestException('Payment amount mismatch');
      await this.finalizeSuccess(reference, d);
      return { status: 'SUCCESS' as const, orderNumber: payment.order.orderNumber };
    }
    if (['failed', 'abandoned', 'reversed'].includes(d.status)) {
      await this.prisma.payment.updateMany({ where: { reference, status: 'INITIATED' }, data: { status: 'FAILED', providerData: d } });
      return { status: 'FAILED' as const, orderNumber: payment.order.orderNumber };
    }
    return { status: 'INITIATED' as const, orderNumber: payment.order.orderNumber };
  }

  /**
   * Idempotent: the conditional update below can succeed exactly once per
   * reference, so repeated callbacks/webhooks never double-process an order.
   */
  async finalizeSuccess(reference: string, providerData?: unknown) {
    const processed = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.payment.updateMany({
        where: { reference, status: { not: 'SUCCESS' } },
        data: { status: 'SUCCESS', paidAt: new Date(), providerData: (providerData ?? undefined) as any },
      });
      if (claim.count !== 1) return null;
      const payment = await tx.payment.findUniqueOrThrow({ where: { reference }, include: { order: { include: { items: true } } } });
      const order = payment.order;
      if (order.status === 'PENDING_PAYMENT') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
        for (const i of order.items) {
          if (i.variantId) {
            const v = await tx.productVariant.findUnique({ where: { id: i.variantId }, select: { productId: true } });
            if (v) await tx.product.update({ where: { id: v.productId }, data: { soldCount: { increment: i.quantity } } });
          }
        }
      } else if (order.status === 'CANCELLED') {
        // Paid after the hold expired: flag for manual refund rather than silently losing the money.
        this.logger.error(`Payment ${reference} succeeded for CANCELLED order ${order.orderNumber}; refund required`);
      }
      return order.id;
    });
    if (processed) {
      const full = await this.prisma.order.findUniqueOrThrow({ where: { id: processed }, include: { items: true, shipment: true, payments: { orderBy: { createdAt: 'desc' } } } });
      if (full.status === 'PAID') {
        await this.mail.order('confirmation', emailData(full));
        await this.mail.order('payment', emailData(full));
      }
    }
    return !!processed;
  }

  verifySignature(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.secret || !rawBody || !signature) return false;
    const expected = createHmac('sha512', this.secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async handleWebhook(event: any) {
    if (event?.event === 'charge.success' && event.data?.reference) {
      // Re-verify with the API so a leaked webhook body can never mark an order paid.
      await this.verify(event.data.reference).catch((e) => this.logger.error(`webhook verify failed: ${e.message}`));
    } else if (event?.event === 'charge.failed' && event.data?.reference) {
      await this.prisma.payment.updateMany({ where: { reference: event.data.reference, status: 'INITIATED' }, data: { status: 'FAILED' } });
    }
  }

  /** Dev-only fake gateway completion. */
  async devComplete(reference: string, outcome: 'success' | 'failed') {
    if (!this.devGateway) throw new NotFoundException();
    const p = await this.prisma.payment.findUnique({ where: { reference } });
    if (!p) throw new NotFoundException('Unknown payment reference');
    if (outcome === 'success') await this.finalizeSuccess(reference, { dev: true });
    else await this.prisma.payment.updateMany({ where: { reference, status: 'INITIATED' }, data: { status: 'FAILED' } });
    return this.verify(reference);
  }

  async refund(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } });
    if (!order) throw new NotFoundException('Order not found');
    const payment = order.payments.find((p) => p.status === 'SUCCESS');
    if (!payment) throw new BadRequestException('No successful payment to refund');
    if (!['PAID', 'PROCESSING', 'CANCELLED', 'DELIVERED', 'SHIPPED'].includes(order.status)) throw new BadRequestException('Order is not refundable');

    if (!this.devGateway) await this.paystack('/refund', { method: 'POST', body: JSON.stringify({ transaction: payment.reference }) });

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      // Restock only if goods never left (cancel() already restocked cancelled orders).
      if (['PAID', 'PROCESSING'].includes(order.status)) {
        for (const i of order.items) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
    });
    const full = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shipment: true, payments: { orderBy: { createdAt: 'desc' } } } });
    await this.mail.order('refunded', emailData(full));
    return full;
  }
}
