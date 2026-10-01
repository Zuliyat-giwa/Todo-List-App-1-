import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';

export class CartLineDto {
  @IsString() @MaxLength(40) variantId: string;
  @IsInt() @Min(1) @Max(99) quantity: number;
}

export class CartDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CartLineDto) items: CartLineDto[];
}

export class QuoteDto extends CartDto {
  @IsOptional() @IsString() @MaxLength(40) code?: string;
  @IsOptional() @IsString() @MaxLength(40) shippingMethodId?: string;
  @IsOptional() @IsString() @MaxLength(2) country?: string;
}

@Controller('cart')
export class CartController {
  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
  ) {}

  /** Server copy of the signed-in user's cart (guests keep theirs in the browser). */
  @Get()
  async get(@CurrentUser() u: AuthUser) {
    const cart = await this.prisma.cart.findUnique({ where: { userId: u.id }, include: { items: true } });
    return { items: (cart?.items ?? []).map((i) => ({ variantId: i.variantId, quantity: i.quantity })) };
  }

  @Put()
  async replace(@CurrentUser() u: AuthUser, @Body() dto: CartDto) {
    const ids = [...new Set(dto.items.map((i) => i.variantId))];
    const valid = new Set((await this.prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((v) => v.id));
    const merged = new Map<string, number>();
    for (const i of dto.items) if (valid.has(i.variantId)) merged.set(i.variantId, Math.min(99, (merged.get(i.variantId) ?? 0) + i.quantity));
    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {} });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (merged.size) await tx.cartItem.createMany({ data: [...merged].map(([variantId, quantity]) => ({ cartId: cart.id, variantId, quantity })) });
    });
    return { ok: true };
  }

  /** Price + validate a cart (public: guests use it too). Totals are always computed server-side. */
  @Public() @HttpCode(200) @Post('quote')
  quote(@Body() dto: QuoteDto) {
    if (!dto.items.length) {
      return { lines: [], subtotalMinor: 0, discountMinor: 0, discountCode: null, shippingMinor: 0, shippingMethodId: null, taxMinor: 0, taxPercent: 0, totalMinor: 0, valid: false };
    }
    return this.pricing.quote(dto.items, { code: dto.code, shippingMethodId: dto.shippingMethodId, country: dto.country });
  }

  @Public() @Get('shipping-methods')
  shipping() {
    return this.prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: { priceMinor: 'asc' } });
  }
}
