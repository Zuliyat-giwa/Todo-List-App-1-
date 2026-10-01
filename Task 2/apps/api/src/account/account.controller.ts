import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Put } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { CatalogService, productInclude, toDto } from '../catalog/catalog.service';
import { AuthUser, CurrentUser } from '../common/decorators';
import { clean } from '../common/util';
import { PrismaService } from '../prisma/prisma.service';
import { publicUser } from '../auth/auth.service';

class ProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(25) phone?: string;
  @IsOptional() @IsIn(['en', 'ar']) language?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
}
class AddressDto {
  @IsOptional() @IsString() @MaxLength(40) label?: string;
  @IsString() @MinLength(2) @MaxLength(100) fullName: string;
  @IsString() @MinLength(6) @MaxLength(25) phone: string;
  @IsString() @Length(2, 2) country: string;
  @IsString() @MinLength(2) @MaxLength(80) state: string;
  @IsString() @MinLength(2) @MaxLength(80) city: string;
  @IsString() @MinLength(3) @MaxLength(200) street: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@Controller('account')
export class AccountController {
  constructor(
    private prisma: PrismaService,
    private catalog: CatalogService,
  ) {}

  @Patch('profile')
  async profile(@CurrentUser() u: AuthUser, @Body() dto: ProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: u.id },
      data: {
        name: dto.name ? clean(dto.name)! : undefined,
        phone: dto.phone !== undefined ? clean(dto.phone) : undefined,
        language: dto.language,
        currency: dto.currency?.toUpperCase(),
        country: dto.country?.toUpperCase(),
      },
    });
    return { user: publicUser(user) };
  }

  // ---- addresses (always scoped to the signed-in user) ----

  @Get('addresses')
  addresses(@CurrentUser() u: AuthUser) {
    return this.prisma.address.findMany({ where: { userId: u.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  @Post('addresses')
  async addAddress(@CurrentUser() u: AuthUser, @Body() dto: AddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId: u.id } });
      const isDefault = dto.isDefault || count === 0;
      if (isDefault) await tx.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
      return tx.address.create({ data: this.sanitize(dto, u.id, isDefault) });
    });
  }

  @Put('addresses/:id')
  async updateAddress(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: AddressDto) {
    const own = await this.prisma.address.findFirst({ where: { id, userId: u.id } });
    if (!own) throw new NotFoundException('Address not found');
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: this.sanitize(dto, u.id, dto.isDefault ?? own.isDefault) });
    });
  }

  @Delete('addresses/:id')
  async removeAddress(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const r = await this.prisma.address.deleteMany({ where: { id, userId: u.id } });
    if (!r.count) throw new NotFoundException('Address not found');
    return { ok: true };
  }

  private sanitize(dto: AddressDto, userId: string, isDefault: boolean) {
    return {
      userId,
      label: clean(dto.label) || null,
      fullName: clean(dto.fullName)!,
      phone: clean(dto.phone)!,
      country: dto.country.toUpperCase(),
      state: clean(dto.state)!,
      city: clean(dto.city)!,
      street: clean(dto.street)!,
      postalCode: clean(dto.postalCode) || null,
      isDefault,
    };
  }

  // ---- wishlist ----

  @Get('wishlist')
  async wishlist(@CurrentUser() u: AuthUser) {
    const w = await this.prisma.wishlist.findUnique({
      where: { userId: u.id },
      include: { items: { orderBy: { createdAt: 'desc' }, include: { product: { include: productInclude } } } },
    });
    return (w?.items ?? []).filter((i) => i.product.isActive).map((i) => toDto(i.product));
  }

  @Get('wishlist/ids')
  async wishlistIds(@CurrentUser() u: AuthUser) {
    const items = await this.prisma.wishlistItem.findMany({ where: { wishlist: { userId: u.id } }, select: { productId: true } });
    return items.map((i) => i.productId);
  }

  @HttpCode(200) @Post('wishlist/:productId')
  async addWish(@CurrentUser() u: AuthUser, @Param('productId') productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw new NotFoundException('Product not found');
    const w = await this.prisma.wishlist.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {} });
    await this.prisma.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: w.id, productId } }, create: { wishlistId: w.id, productId }, update: {} });
    return { ok: true };
  }

  @Delete('wishlist/:productId')
  async removeWish(@CurrentUser() u: AuthUser, @Param('productId') productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { productId, wishlist: { userId: u.id } } });
    return { ok: true };
  }

  // ---- recently viewed ----

  @HttpCode(200) @Post('recently-viewed/:productId')
  async viewed(@CurrentUser() u: AuthUser, @Param('productId') productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) return { ok: false };
    await this.prisma.recentlyViewed.upsert({
      where: { userId_productId: { userId: u.id, productId } },
      create: { userId: u.id, productId },
      update: { viewedAt: new Date() },
    });
    return { ok: true };
  }

  @Get('recently-viewed')
  async recent(@CurrentUser() u: AuthUser) {
    const rows = await this.prisma.recentlyViewed.findMany({ where: { userId: u.id }, orderBy: { viewedAt: 'desc' }, take: 8, select: { productId: true } });
    return this.catalog.byIds(rows.map((r) => r.productId));
  }
}
