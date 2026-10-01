import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CatalogService, productInclude, toDto } from '../catalog/catalog.service';
import { config } from '../common/config';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { clean, slugify } from '../common/util';
import { OrdersService, orderDto } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BannerDto, CategoryDto, CountryDto, DiscountDto, FaqDto, OrderStatusDto, PolicyDto, ProductDto, RoleDto, ShipmentDto, ShippingMethodDto, StoreInfoDto,
} from './admin.dto';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
const orderInclude = { items: true, shipment: true, payments: { orderBy: { createdAt: 'desc' } } } satisfies Prisma.OrderInclude;
const page = (p?: string, size = 20) => ({ take: size, skip: (Math.max(1, parseInt(p || '1', 10) || 1) - 1) * size });

@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private payments: PaymentsService,
    private catalog: CatalogService,
  ) {}

  // ---------------------------------------------------------------- overview

  @Get('stats')
  async stats() {
    const paid: Prisma.OrderWhereInput = { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } };
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [sales, orders, customers, products, pending, completed, lowStock, recent, last30] = await Promise.all([
      this.prisma.order.aggregate({ where: paid, _sum: { totalMinor: true } }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.product.count(),
      this.prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'] } } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.productVariant.findMany({ where: { stock: { lte: 5 }, product: { isActive: true } }, orderBy: { stock: 'asc' }, take: 10, include: { product: { select: { name: true } } } }),
      this.prisma.payment.findMany({ where: { status: { in: ['SUCCESS', 'REFUNDED'] } }, orderBy: { createdAt: 'desc' }, take: 8, include: { order: { select: { orderNumber: true, customerName: true } } } }),
      this.prisma.order.findMany({ where: { ...paid, createdAt: { gte: since } }, select: { createdAt: true, totalMinor: true } }),
    ]);
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) byDay.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
    for (const o of last30) {
      const k = o.createdAt.toISOString().slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + o.totalMinor);
    }
    return {
      totalSalesMinor: sales._sum.totalMinor ?? 0,
      totalOrders: orders,
      totalCustomers: customers,
      totalProducts: products,
      pendingOrders: pending,
      completedOrders: completed,
      lowStock: lowStock.map((v) => ({ variantId: v.id, product: v.product.name, sku: v.sku, size: v.size, color: v.color, stock: v.stock })),
      recentTransactions: recent.map((p) => ({ reference: p.reference, amountMinor: p.amountMinor, status: p.status, orderNumber: p.order.orderNumber, customer: p.order.customerName, at: p.paidAt ?? p.createdAt })),
      salesByDay: [...byDay].map(([date, totalMinor]) => ({ date, totalMinor })),
    };
  }

  // ---------------------------------------------------------------- products

  @Get('products')
  async products(@Query('q') q?: string, @Query('page') p?: string) {
    const where: Prisma.ProductWhereInput = q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { baseSku: { contains: q, mode: 'insensitive' } }] } : {};
    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, ...page(p), include: { ...productInclude, attributes: true } }),
    ]);
    return { total, items: items.map((i) => ({ ...toDto(i), isActive: i.isActive, attributes: i.attributes })) };
  }

  @Get('products/export.csv')
  async exportCsv(@Res() res: Response) {
    const rows = await this.prisma.productVariant.findMany({ include: { product: { include: { category: true } } }, orderBy: { sku: 'asc' } });
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      'sku,product,category,audience,size,color,price_ngn,sale_price_ngn,stock,active',
      ...rows.map((v) => [v.sku, v.product.name, v.product.category.name, v.product.audience, v.size, v.color, (v.priceMinor ?? v.product.priceMinor) / 100, v.product.salePriceMinor != null ? v.product.salePriceMinor / 100 : '', v.stock, v.product.isActive].map(esc).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csv);
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: { ...productInclude, attributes: true } });
    if (!p) throw new NotFoundException('Product not found');
    return { ...toDto(p), isActive: p.isActive, attributes: p.attributes };
  }

  private productData(dto: ProductDto) {
    if (dto.salePriceMinor != null && dto.salePriceMinor >= dto.priceMinor) throw new BadRequestException('Sale price must be lower than the regular price');
    const skus = dto.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new BadRequestException('Variant SKUs must be unique');
    if (!dto.variants.length) throw new BadRequestException('Add at least one variant (use a single default variant for products without options)');
    return {
      name: clean(dto.name)!,
      nameAr: clean(dto.nameAr) || null,
      description: clean(dto.description)!,
      descriptionAr: clean(dto.descriptionAr) || null,
      categoryId: dto.categoryId,
      audience: dto.audience,
      brand: clean(dto.brand) || null,
      material: clean(dto.material) || null,
      collection: clean(dto.collection) || null,
      priceMinor: dto.priceMinor,
      salePriceMinor: dto.salePriceMinor ?? null,
      currentPriceMinor: dto.salePriceMinor ?? dto.priceMinor,
      baseSku: clean(dto.baseSku)!,
      isFeatured: dto.isFeatured ?? false,
      isNewArrival: dto.isNewArrival ?? false,
      isBestSeller: dto.isBestSeller ?? false,
      isActive: dto.isActive ?? true,
    };
  }

  @Post('products')
  async createProduct(@Body() dto: ProductDto) {
    const data = this.productData(dto);
    const slug = await this.uniqueSlug(slugify(dto.name));
    const p = await this.prisma.product.create({
      data: {
        ...data,
        slug,
        images: { create: dto.images.map((i, n) => ({ url: i.url, alt: clean(i.alt) || dto.name, sortOrder: n })) },
        variants: { create: dto.variants.map((v) => ({ sku: v.sku, size: clean(v.size) || null, color: clean(v.color) || null, priceMinor: v.priceMinor ?? null, stock: v.stock })) },
        attributes: { create: (dto.attributes ?? []).map((a) => ({ key: clean(a.key)!, value: clean(a.value)! })) },
      },
      include: productInclude,
    });
    return toDto(p);
  }

  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: ProductDto) {
    const data = this.productData(dto);
    const existing = await this.prisma.product.findUnique({ where: { id }, include: { variants: true } });
    if (!existing) throw new NotFoundException('Product not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productImage.createMany({ data: dto.images.map((i, n) => ({ productId: id, url: i.url, alt: clean(i.alt) || dto.name, sortOrder: n })) });
      await tx.productAttribute.deleteMany({ where: { productId: id } });
      await tx.productAttribute.createMany({ data: (dto.attributes ?? []).map((a) => ({ productId: id, key: clean(a.key)!, value: clean(a.value)! })) });

      const keep = new Set(dto.variants.filter((v) => v.id).map((v) => v.id!));
      await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: [...keep] } } });
      for (const v of dto.variants) {
        const row = { sku: v.sku, size: clean(v.size) || null, color: clean(v.color) || null, priceMinor: v.priceMinor ?? null, stock: v.stock };
        if (v.id && existing.variants.some((x) => x.id === v.id)) await tx.productVariant.update({ where: { id: v.id }, data: row });
        else await tx.productVariant.create({ data: { ...row, productId: id } });
      }
    });
    return this.product(id);
  }

  @Patch('variants/:id/stock')
  async setStock(@Param('id') id: string, @Body() body: { stock: number }) {
    const stock = Math.floor(Number(body?.stock));
    if (!Number.isFinite(stock) || stock < 0) throw new BadRequestException('Stock must be zero or more');
    return this.prisma.productVariant.update({ where: { id }, data: { stock } });
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    const used = await this.prisma.orderItem.count({ where: { variant: { productId: id } } });
    if (used) {
      // Keep order history intact: hide the product instead of deleting it.
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { ok: true, archived: true };
    }
    await this.prisma.product.delete({ where: { id } });
    return { ok: true, archived: false };
  }

  private async uniqueSlug(base: string) {
    let slug = base || 'product';
    for (let n = 2; await this.prisma.product.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    return slug;
  }

  // -------------------------------------------------------------- categories

  @Get('categories')
  categories() {
    return this.catalog.categoryTree();
  }

  @Post('categories')
  async createCategory(@Body() dto: CategoryDto) {
    let slug = slugify(dto.name);
    for (let n = 2; await this.prisma.category.findUnique({ where: { slug } }); n++) slug = `${slugify(dto.name)}-${n}`;
    return this.prisma.category.create({ data: { name: clean(dto.name)!, nameAr: clean(dto.nameAr), description: clean(dto.description), imageUrl: dto.imageUrl, parentId: dto.parentId || null, sortOrder: dto.sortOrder ?? 0, slug } });
  }

  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: CategoryDto) {
    if (dto.parentId === id) throw new BadRequestException('A category cannot be its own parent');
    return this.prisma.category.update({ where: { id }, data: { name: clean(dto.name)!, nameAr: clean(dto.nameAr), description: clean(dto.description), imageUrl: dto.imageUrl, parentId: dto.parentId || null, sortOrder: dto.sortOrder ?? 0 } });
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    const n = await this.prisma.product.count({ where: { categoryId: id } });
    if (n) throw new BadRequestException(`Move or delete the ${n} product(s) in this category first`);
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  // ------------------------------------------------------------------ orders

  @Get('orders')
  async ordersList(@Query('q') q?: string, @Query('status') status?: string, @Query('page') p?: string) {
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as any;
    if (q) where.OR = [{ orderNumber: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { customerName: { contains: q, mode: 'insensitive' } }];
    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, ...page(p), include: orderInclude }),
    ]);
    return { total, items: items.map(orderDto) };
  }

  @Get('orders/:id')
  async orderOne(@Param('id') id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!o) throw new NotFoundException('Order not found');
    return orderDto(o);
  }

  @Patch('orders/:id/status')
  async setStatus(@Param('id') id: string, @Body() dto: OrderStatusDto) {
    await this.orders.setStatus(id, dto.status);
    return this.orderOne(id);
  }

  @Patch('orders/:id/shipment')
  async shipment(@Param('id') id: string, @Body() dto: ShipmentDto) {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Order not found');
    await this.prisma.shipment.upsert({
      where: { orderId: id },
      create: { orderId: id, carrier: clean(dto.carrier), trackingNumber: clean(dto.trackingNumber) },
      update: { carrier: clean(dto.carrier), trackingNumber: clean(dto.trackingNumber) },
    });
    if (['PAID', 'PROCESSING'].includes(o.status)) await this.orders.setStatus(id, 'SHIPPED'); // sends the shipping email with tracking
    return this.orderOne(id);
  }

  @HttpCode(200) @Post('orders/:id/refund')
  async refund(@Param('id') id: string) {
    await this.payments.refund(id);
    return this.orderOne(id);
  }

  @HttpCode(200) @Post('orders/:id/verify-payment')
  async verifyPayment(@Param('id') id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: 'desc' } } } });
    if (!o) throw new NotFoundException('Order not found');
    for (const p of o.payments) if (p.status === 'INITIATED') await this.payments.verify(p.reference).catch(() => undefined);
    return this.orderOne(id);
  }

  // --------------------------------------------------------------- customers

  @Get('customers')
  async customers(@Query('q') q?: string, @Query('page') p?: string) {
    const where: Prisma.UserWhereInput = q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {};
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, ...page(p), select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, _count: { select: { orders: true } } } }),
    ]);
    return { total, items };
  }

  @Get('customers/:id')
  async customer(@Param('id') id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true, createdAt: true, addresses: true, orders: { orderBy: { createdAt: 'desc' }, include: orderInclude } } });
    if (!u) throw new NotFoundException('Customer not found');
    return { ...u, orders: u.orders.map(orderDto) };
  }

  @Patch('customers/:id/role')
  async setRole(@Param('id') id: string, @Body() dto: RoleDto, @CurrentUser() me: AuthUser) {
    if (id === me.id) throw new BadRequestException('You cannot change your own role');
    await this.prisma.user.update({ where: { id }, data: { role: dto.role } });
    return { ok: true };
  }

  // --------------------------------------------------------------- discounts

  @Get('discounts')
  discounts() {
    return this.prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post('discounts')
  async createDiscount(@Body() dto: DiscountDto) {
    if (dto.type === 'PERCENT' && dto.value > 100) throw new BadRequestException('Percentage cannot exceed 100');
    return this.prisma.discountCode.create({ data: { code: dto.code.trim().toUpperCase(), type: dto.type, value: dto.value, minPurchaseMinor: dto.minPurchaseMinor ?? 0, usageLimit: dto.usageLimit ?? null, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, isActive: dto.isActive ?? true } });
  }

  @Put('discounts/:id')
  async updateDiscount(@Param('id') id: string, @Body() dto: DiscountDto) {
    if (dto.type === 'PERCENT' && dto.value > 100) throw new BadRequestException('Percentage cannot exceed 100');
    return this.prisma.discountCode.update({ where: { id }, data: { code: dto.code.trim().toUpperCase(), type: dto.type, value: dto.value, minPurchaseMinor: dto.minPurchaseMinor ?? 0, usageLimit: dto.usageLimit ?? null, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, isActive: dto.isActive ?? true } });
  }

  @Delete('discounts/:id')
  async deleteDiscount(@Param('id') id: string) {
    await this.prisma.discountCode.delete({ where: { id } });
    return { ok: true };
  }

  // ----------------------------------------------------------------- content

  @Get('banners')
  banners() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  @Post('banners')
  createBanner(@Body() dto: BannerDto) {
    return this.prisma.banner.create({ data: dto });
  }
  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: BannerDto) {
    return this.prisma.banner.update({ where: { id }, data: dto });
  }
  @Delete('banners/:id')
  async deleteBanner(@Param('id') id: string) {
    await this.prisma.banner.delete({ where: { id } });
    return { ok: true };
  }

  @Post('faqs')
  createFaq(@Body() dto: FaqDto) {
    return this.prisma.faq.create({ data: { question: clean(dto.question)!, answer: clean(dto.answer)!, sortOrder: dto.sortOrder ?? 0 } });
  }
  @Put('faqs/:id')
  updateFaq(@Param('id') id: string, @Body() dto: FaqDto) {
    return this.prisma.faq.update({ where: { id }, data: { question: clean(dto.question)!, answer: clean(dto.answer)!, sortOrder: dto.sortOrder ?? 0 } });
  }
  @Delete('faqs/:id')
  async deleteFaq(@Param('id') id: string) {
    await this.prisma.faq.delete({ where: { id } });
    return { ok: true };
  }

  @Put('policies/:key')
  async setPolicy(@Param('key') key: string, @Body() dto: PolicyDto) {
    if (!/^[a-z-]{3,30}$/.test(key)) throw new BadRequestException('Invalid policy key');
    const value = { title: clean(dto.title)!, body: clean(dto.body)! };
    await this.prisma.storeSetting.upsert({ where: { key: `policy.${key}` }, create: { key: `policy.${key}`, value }, update: { value } });
    return value;
  }

  // ---------------------------------------------------------------- settings

  @Get('settings')
  async settings() {
    const [info, countries, shipping] = await Promise.all([
      this.prisma.storeSetting.findUnique({ where: { key: 'store.info' } }),
      this.prisma.supportedCountry.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.shippingMethod.findMany({ orderBy: { priceMinor: 'asc' } }),
    ]);
    return { info: info?.value ?? {}, countries, shipping, integrations: { mailgun: !!process.env.MAILGUN_API_KEY && !!process.env.MAILGUN_DOMAIN, paystack: !!process.env.PAYSTACK_SECRET_KEY, google: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET } };
  }

  @Put('settings/info')
  async setInfo(@Body() dto: StoreInfoDto) {
    await this.prisma.storeSetting.upsert({ where: { key: 'store.info' }, create: { key: 'store.info', value: dto as any }, update: { value: dto as any } });
    return dto;
  }

  @Put('settings/countries/:code')
  upsertCountry(@Param('code') code: string, @Body() dto: CountryDto) {
    const data = { name: clean(dto.name)!, language: dto.language, currency: dto.currency.toUpperCase(), rateFromBase: dto.rateFromBase, taxPercent: dto.taxPercent, isActive: dto.isActive ?? true };
    return this.prisma.supportedCountry.upsert({ where: { code: code.toUpperCase() }, create: { code: code.toUpperCase(), ...data }, update: data });
  }

  @Post('settings/shipping')
  createShipping(@Body() dto: ShippingMethodDto) {
    return this.prisma.shippingMethod.create({ data: { ...dto, name: clean(dto.name)!, freeOverMinor: dto.freeOverMinor ?? null, isActive: dto.isActive ?? true } });
  }
  @Put('settings/shipping/:id')
  updateShipping(@Param('id') id: string, @Body() dto: ShippingMethodDto) {
    return this.prisma.shippingMethod.update({ where: { id }, data: { ...dto, name: clean(dto.name)!, freeOverMinor: dto.freeOverMinor ?? null, isActive: dto.isActive ?? true } });
  }

  // ----------------------------------------------------------------- uploads

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => cb(null, randomBytes(12).toString('hex') + extname(file.originalname).toLowerCase()),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)),
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Upload a JPEG, PNG, WebP or AVIF image up to 5MB');
    return { url: `${config.apiUrl}/uploads/${file.filename}` };
  }
}
