import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { InputLine, PricingService } from '../cart/pricing.service';
import { clean, orderNumber } from '../common/util';
import { MailService } from '../mail/mail.service';
import { OrderEmailData } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';

export const HOLD_MINUTES = 30;

export interface CheckoutInput {
  customer: { name: string; email: string; phone: string };
  address: { country: string; state: string; city: string; street: string; postalCode?: string; notes?: string };
  shippingMethodId: string;
  items: InputLine[];
  discountCode?: string;
  idempotencyKey?: string;
}

const orderInclude = { items: true, shipment: true, payments: { orderBy: { createdAt: 'desc' } } } satisfies Prisma.OrderInclude;
export type OrderFull = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const orderDto = (o: OrderFull) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  status: o.status,
  email: o.email,
  customerName: o.customerName,
  phone: o.phone,
  currency: o.currency,
  subtotalMinor: o.subtotalMinor,
  discountMinor: o.discountMinor,
  discountCode: o.discountCode,
  shippingMinor: o.shippingMinor,
  taxMinor: o.taxMinor,
  totalMinor: o.totalMinor,
  shippingMethod: o.shippingMethod,
  address: { country: o.shipCountry, state: o.shipState, city: o.shipCity, street: o.shipStreet, postalCode: o.shipPostalCode, notes: o.deliveryNotes },
  createdAt: o.createdAt,
  items: o.items.map((i) => ({ id: i.id, productName: i.productName, sku: i.sku, size: i.size, color: i.color, imageUrl: i.imageUrl, unitMinor: i.unitMinor, quantity: i.quantity })),
  payment: o.payments[0] ? { status: o.payments[0].status, provider: o.payments[0].provider, paidAt: o.payments[0].paidAt } : null,
  shipment: o.shipment && { carrier: o.shipment.carrier, trackingNumber: o.shipment.trackingNumber, status: o.shipment.status, shippedAt: o.shipment.shippedAt, deliveredAt: o.shipment.deliveredAt },
});

export const emailData = (o: OrderFull): OrderEmailData => ({
  orderNumber: o.orderNumber,
  customerName: o.customerName,
  email: o.email,
  items: o.items,
  subtotalMinor: o.subtotalMinor,
  discountMinor: o.discountMinor,
  shippingMinor: o.shippingMinor,
  taxMinor: o.taxMinor,
  totalMinor: o.totalMinor,
  trackingNumber: o.shipment?.trackingNumber,
  carrier: o.shipment?.carrier,
});

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger('Orders');
  private timer?: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
    private mail: MailService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => this.releaseExpired().catch((e) => this.logger.error(e)), 5 * 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Creates an order in PENDING_PAYMENT and atomically reserves stock. The order
   * only becomes PAID after the payment provider confirms the charge on the
   * backend. Unpaid orders release their stock after HOLD_MINUTES.
   */
  async createOrder(input: CheckoutInput, userId?: string) {
    if (input.idempotencyKey) {
      const dup = await this.prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: orderInclude });
      if (dup) {
        if (dup.userId && dup.userId !== userId) throw new ForbiddenException();
        return dup;
      }
    }
    await this.releaseExpired().catch(() => undefined);

    const country = await this.prisma.supportedCountry.findFirst({ where: { code: input.address.country.toUpperCase(), isActive: true } });
    if (!country) throw new BadRequestException('We do not ship to the selected country yet');
    const method = await this.prisma.shippingMethod.findFirst({ where: { id: input.shippingMethodId, isActive: true } });
    if (!method) throw new BadRequestException('Please choose a valid shipping method');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const q = await this.pricing.quote(input.items, { code: input.discountCode, shippingMethodId: method.id, country: country.code }, tx);
        if (!q.lines.length) throw new BadRequestException('Your cart is empty');
        const bad = q.lines.find((l) => l.issue);
        if (bad) throw new ConflictException(`"${bad.name}" is ${bad.issue === 'LIMITED_STOCK' ? `limited to ${bad.stock} in stock` : 'no longer available'}`);
        if (input.discountCode && q.discountError) throw new BadRequestException(q.discountError);

        for (const l of q.lines) {
          // Conditional decrement is atomic: concurrent buyers cannot oversell.
          const r = await tx.productVariant.updateMany({ where: { id: l.variantId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
          if (r.count !== 1) throw new ConflictException(`"${l.name}" just sold out. Please update your cart.`);
        }

        let discountId: string | undefined;
        if (q.discountCode) {
          const code = await tx.discountCode.findUniqueOrThrow({ where: { code: q.discountCode } });
          const n = await tx.$executeRaw`UPDATE "DiscountCode" SET "usedCount" = "usedCount" + 1 WHERE id = ${code.id} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
          if (n !== 1) throw new BadRequestException('This discount code has reached its usage limit');
          discountId = code.id;
        }

        const order = await tx.order.create({
          data: {
            orderNumber: orderNumber(),
            userId,
            email: input.customer.email.toLowerCase().trim(),
            customerName: clean(input.customer.name)!,
            phone: clean(input.customer.phone)!,
            subtotalMinor: q.subtotalMinor,
            discountMinor: q.discountMinor,
            discountCode: q.discountCode,
            shippingMinor: q.shippingMinor,
            taxMinor: q.taxMinor,
            totalMinor: q.totalMinor,
            shippingMethod: method.name,
            shipCountry: country.code,
            shipState: clean(input.address.state)!,
            shipCity: clean(input.address.city)!,
            shipStreet: clean(input.address.street)!,
            shipPostalCode: clean(input.address.postalCode) || null,
            deliveryNotes: clean(input.address.notes) || null,
            idempotencyKey: input.idempotencyKey,
            items: {
              create: q.lines.map((l) => ({
                variantId: l.variantId,
                productName: l.name,
                sku: l.sku,
                size: l.size,
                color: l.color,
                imageUrl: l.imageUrl,
                unitMinor: l.unitMinor,
                quantity: l.quantity,
              })),
            },
          },
          include: orderInclude,
        });
        if (discountId) await tx.discountUsage.create({ data: { codeId: discountId, userId, orderId: order.id } });
        return order;
      });
    } catch (e) {
      // Two simultaneous submits with the same idempotency key: return the winner's order.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && input.idempotencyKey) {
        const dup = await this.prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: orderInclude });
        if (dup) return dup;
      }
      throw e;
    }
  }

  /** Access rule: owner (signed in) or someone who knows both order number and email. */
  async getAuthorized(orderNo: string, userId?: string, email?: string) {
    const o = await this.prisma.order.findUnique({ where: { orderNumber: orderNo }, include: orderInclude });
    if (!o) throw new NotFoundException('Order not found');
    const owner = userId && o.userId === userId;
    const emailOk = email && email.toLowerCase().trim() === o.email;
    if (!owner && !emailOk) throw new NotFoundException('Order not found');
    return o;
  }

  async listForUser(userId: string) {
    const orders = await this.prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: orderInclude });
    return orders.map(orderDto);
  }

  /** Cancels an order, returns reserved stock and discount usage. Safe to call twice. */
  async cancel(orderId: string, opts: { notify?: boolean } = {}) {
    const result = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!o) throw new NotFoundException('Order not found');
      if (['CANCELLED', 'REFUNDED'].includes(o.status)) return null;
      if (['SHIPPED', 'DELIVERED'].includes(o.status)) throw new BadRequestException('Shipped orders cannot be cancelled');
      const claimed = await tx.order.updateMany({ where: { id: orderId, status: o.status }, data: { status: 'CANCELLED' } });
      if (claimed.count !== 1) return null;
      for (const i of o.items) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
      if (o.discountCode) {
        const usage = await tx.discountUsage.deleteMany({ where: { orderId: o.id } });
        if (usage.count) await tx.discountCode.update({ where: { code: o.discountCode }, data: { usedCount: { decrement: 1 } } });
      }
      await tx.payment.updateMany({ where: { orderId, status: 'INITIATED' }, data: { status: 'FAILED' } });
      return o;
    });
    if (result && opts.notify !== false && result.status !== 'PENDING_PAYMENT') {
      const full = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
      await this.mail.order('cancelled', emailData(full));
    }
    return result;
  }

  async releaseExpired() {
    const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000);
    const stale = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff }, payments: { none: { status: 'SUCCESS' } } },
      select: { id: true },
      take: 50,
    });
    for (const s of stale) await this.cancel(s.id, { notify: false }).catch(() => undefined);
    return stale.length;
  }

  async setStatus(orderId: string, status: OrderStatus) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o) throw new NotFoundException('Order not found');
    if (status === 'CANCELLED') return this.cancel(orderId);
    const allowed: Record<string, OrderStatus[]> = {
      PENDING_PAYMENT: ['PAID'],
      PAID: ['PROCESSING', 'SHIPPED'],
      PROCESSING: ['SHIPPED'],
      SHIPPED: ['DELIVERED'],
    };
    if (!allowed[o.status]?.includes(status)) throw new BadRequestException(`Cannot move an order from ${o.status} to ${status}`);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status } });
      if (status === 'SHIPPED') {
        await tx.shipment.upsert({ where: { orderId }, create: { orderId, status: 'IN_TRANSIT', shippedAt: new Date() }, update: { status: 'IN_TRANSIT', shippedAt: new Date() } });
      }
      if (status === 'DELIVERED') {
        await tx.shipment.upsert({ where: { orderId }, create: { orderId, status: 'DELIVERED', deliveredAt: new Date() }, update: { status: 'DELIVERED', deliveredAt: new Date() } });
      }
    });
    const full = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    const kind = ({ PROCESSING: 'processing', SHIPPED: 'shipped', DELIVERED: 'delivered' } as const)[status as 'PROCESSING'];
    if (kind) await this.mail.order(kind, emailData(full));
    return full;
  }
}
