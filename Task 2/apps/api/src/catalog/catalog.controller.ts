import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService, ListQuery } from './catalog.service';

class ReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(100) title?: string;
  @IsString() @MinLength(3) @MaxLength(2000) body: string;
}
class NewsletterDto {
  @IsEmail() email: string;
}

@Controller()
export class CatalogController {
  constructor(
    private catalog: CatalogService,
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /** Used by Render/uptime monitors. Touches the database so a broken connection is visible. */
  @Public() @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }

  @Public() @Get('categories')
  categories() {
    return this.catalog.categoryTree();
  }

  @Public() @Get('products')
  list(@Query() q: ListQuery) {
    return this.catalog.list(q);
  }

  @Public() @Get('products/facets')
  facets(@Query() q: ListQuery) {
    return this.catalog.facets(q);
  }

  @Public() @Get('products/suggest')
  suggest(@Query('q') q: string) {
    return this.catalog.suggest(q);
  }

  @Public() @Get('products/by-ids')
  byIds(@Query('ids') ids: string) {
    return this.catalog.byIds((ids || '').split(',').filter(Boolean));
  }

  @Public() @Get('products/:slug')
  one(@Param('slug') slug: string) {
    return this.catalog.bySlug(slug);
  }

  @Public() @Get('products/:id/reviews')
  reviews(@Param('id') id: string) {
    return this.catalog.reviews(id);
  }

  @Post('products/:id/reviews')
  async addReview(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() dto: ReviewDto) {
    await this.catalog.addReview(u.id, id, dto.rating, dto.title, dto.body);
    return { ok: true };
  }

  // ---- storefront content ----

  @Public() @Get('content/home')
  async home() {
    const [banners, newArrivals, bestSellers, featured, testimonials] = await Promise.all([
      this.prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.catalog.list({ isNew: 'true', limit: '8' }),
      this.catalog.list({ bestSeller: 'true', limit: '8', sort: 'popular' }),
      this.catalog.list({ featured: 'true', limit: '8' }),
      this.prisma.review.findMany({
        where: { rating: { gte: 4 } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
      }),
    ]);
    return {
      banners,
      newArrivals: newArrivals.items,
      bestSellers: bestSellers.items,
      featured: featured.items,
      testimonials: testimonials.map((r) => ({ id: r.id, rating: r.rating, body: r.body, author: r.user.name.split(' ')[0], product: r.product })),
    };
  }

  @Public() @Get('content/faqs')
  faqs() {
    return this.prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Public() @Get('content/policies')
  async policies() {
    const rows = await this.prisma.storeSetting.findMany({ where: { key: { startsWith: 'policy.' } } });
    return Object.fromEntries(rows.map((r) => [r.key.replace('policy.', ''), r.value]));
  }

  @Public() @Get('content/store')
  async store() {
    const row = await this.prisma.storeSetting.findUnique({ where: { key: 'store.info' } });
    const v = (row?.value ?? {}) as Record<string, string>;
    return { name: v.name, announcement: v.announcement, supportEmail: v.supportEmail, phone: v.phone };
  }

  @Public() @Get('content/countries')
  countries() {
    return this.prisma.supportedCountry.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  @Public() @HttpCode(200) @Post('newsletter')
  async subscribe(@Body() dto: NewsletterDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!exists) {
      await this.prisma.newsletterSubscriber.create({ data: { email } });
      await this.mail.newsletter(email);
    }
    return { ok: true };
  }
}
