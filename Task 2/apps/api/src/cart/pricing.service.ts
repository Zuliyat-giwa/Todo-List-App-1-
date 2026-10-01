import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface InputLine {
  variantId: string;
  quantity: number;
}

export interface QuoteLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  unitMinor: number;
  compareAtMinor: number;
  quantity: number;
  stock: number;
  lineMinor: number;
  issue?: 'OUT_OF_STOCK' | 'LIMITED_STOCK' | 'UNAVAILABLE';
}

export interface Quote {
  lines: QuoteLine[];
  subtotalMinor: number;
  discountMinor: number;
  discountCode: string | null;
  discountError?: string;
  shippingMinor: number;
  shippingMethodId: string | null;
  taxMinor: number;
  taxPercent: number;
  totalMinor: number;
  valid: boolean;
}

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Single source of truth for prices. The browser only ever sends variant ids and
 * quantities; every amount is recomputed here from the database.
 */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async quote(
    input: InputLine[],
    opts: { code?: string; shippingMethodId?: string; country?: string } = {},
    db: Db = this.prisma,
  ): Promise<Quote> {
    // Merge duplicate variants and clamp quantities.
    const merged = new Map<string, number>();
    for (const l of input) {
      const q = Math.floor(Number(l.quantity));
      if (!l.variantId || !Number.isFinite(q) || q < 1) throw new BadRequestException('Invalid cart item');
      merged.set(l.variantId, Math.min(99, (merged.get(l.variantId) ?? 0) + q));
    }

    const variants = await db.productVariant.findMany({
      where: { id: { in: [...merged.keys()] } },
      include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
    });

    const lines: QuoteLine[] = [];
    for (const [variantId, quantity] of merged) {
      const v = variants.find((x) => x.id === variantId);
      if (!v) throw new BadRequestException('An item in your cart no longer exists');
      const p = v.product;
      const unitMinor = v.priceMinor ?? p.currentPriceMinor;
      let issue: QuoteLine['issue'];
      if (!p.isActive) issue = 'UNAVAILABLE';
      else if (v.stock <= 0) issue = 'OUT_OF_STOCK';
      else if (v.stock < quantity) issue = 'LIMITED_STOCK';
      lines.push({
        variantId,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        imageUrl: p.images[0]?.url ?? null,
        unitMinor,
        compareAtMinor: p.priceMinor,
        quantity,
        stock: v.stock,
        lineMinor: unitMinor * quantity,
        issue,
      });
    }

    const subtotalMinor = lines.reduce((n, l) => n + l.lineMinor, 0);

    // ---- discount ----
    let discountMinor = 0;
    let discountCode: string | null = null;
    let discountError: string | undefined;
    if (opts.code?.trim()) {
      const code = opts.code.trim().toUpperCase();
      const d = await db.discountCode.findUnique({ where: { code } });
      if (!d || !d.isActive) discountError = 'This discount code is not valid';
      else if (d.expiresAt && d.expiresAt < new Date()) discountError = 'This discount code has expired';
      else if (d.usageLimit != null && d.usedCount >= d.usageLimit) discountError = 'This discount code has reached its usage limit';
      else if (subtotalMinor < d.minPurchaseMinor)
        discountError = `Spend at least ${(d.minPurchaseMinor / 100).toLocaleString('en-NG')} NGN to use this code`;
      else {
        discountCode = d.code;
        discountMinor = d.type === 'PERCENT' ? Math.round((subtotalMinor * d.value) / 100) : d.value;
        discountMinor = Math.min(discountMinor, subtotalMinor);
      }
    }

    // ---- shipping ----
    let shippingMinor = 0;
    let shippingMethodId: string | null = null;
    if (opts.shippingMethodId) {
      const m = await db.shippingMethod.findFirst({ where: { id: opts.shippingMethodId, isActive: true } });
      if (!m) throw new BadRequestException('Invalid shipping method');
      shippingMethodId = m.id;
      const net = subtotalMinor - discountMinor;
      shippingMinor = m.freeOverMinor != null && net >= m.freeOverMinor ? 0 : m.priceMinor;
    }

    // ---- tax (tax-exclusive pricing) ----
    let taxPercent = 0;
    if (opts.country) {
      const c = await db.supportedCountry.findUnique({ where: { code: opts.country.toUpperCase() } });
      taxPercent = c?.taxPercent ?? 0;
    }
    const taxMinor = Math.round(((subtotalMinor - discountMinor) * taxPercent) / 100);
    const totalMinor = subtotalMinor - discountMinor + shippingMinor + taxMinor;

    return {
      lines,
      subtotalMinor,
      discountMinor,
      discountCode,
      discountError,
      shippingMinor,
      shippingMethodId,
      taxMinor,
      taxPercent,
      totalMinor,
      valid: lines.length > 0 && lines.every((l) => !l.issue),
    };
  }
}
