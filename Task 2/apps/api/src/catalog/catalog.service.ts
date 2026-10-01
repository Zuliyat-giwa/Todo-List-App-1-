import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Audience, Prisma } from '@prisma/client';
import { clean } from '../common/util';
import { PrismaService } from '../prisma/prisma.service';

export const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: { sku: 'asc' } },
  category: { include: { parent: true } },
} satisfies Prisma.ProductInclude;

type ProductFull = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Shape sent to the storefront. Stock levels are exposed as numbers for availability UI only. */
export function toDto(p: ProductFull) {
  const totalStock = p.variants.reduce((n, v) => n + v.stock, 0);
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    slug: p.slug,
    description: p.description,
    descriptionAr: p.descriptionAr,
    audience: p.audience,
    brand: p.brand,
    material: p.material,
    collection: p.collection,
    sku: p.baseSku,
    priceMinor: p.priceMinor,
    salePriceMinor: p.salePriceMinor,
    currentPriceMinor: p.currentPriceMinor,
    onSale: p.salePriceMinor != null && p.salePriceMinor < p.priceMinor,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    inStock: totalStock > 0,
    category: { id: p.category.id, name: p.category.name, nameAr: p.category.nameAr, slug: p.category.slug, parent: p.category.parent && { name: p.category.parent.name, slug: p.category.parent.slug } },
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      priceMinor: v.priceMinor ?? p.currentPriceMinor,
      stock: v.stock,
    })),
  };
}

export interface ListQuery {
  q?: string;
  category?: string;
  audience?: string;
  collection?: string;
  brand?: string;
  size?: string;
  color?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  minRating?: string;
  onSale?: string;
  featured?: string;
  isNew?: string;
  bestSeller?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async categoryTree() {
    const all = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    const node = (c: (typeof all)[number]) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      slug: c.slug,
      imageUrl: c.imageUrl,
      productCount: c._count.products,
      parentId: c.parentId,
    });
    return all
      .filter((c) => !c.parentId)
      .map((c) => ({ ...node(c), children: all.filter((k) => k.parentId === c.id).map(node) }));
  }

  private async where(q: ListQuery): Promise<Prisma.ProductWhereInput> {
    const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

    if (q.category) {
      const cat = await this.prisma.category.findUnique({ where: { slug: q.category }, include: { children: { select: { id: true } } } });
      if (!cat) return { id: '__none__' };
      and.push({ categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } });
    }
    if (q.audience) {
      const a = q.audience.toUpperCase();
      if (!(a in Audience)) throw new BadRequestException('Invalid audience');
      // Kids covers boys and girls too
      and.push({ audience: { in: a === 'KIDS' ? ['KIDS', 'BOYS', 'GIRLS'] : [a as Audience] } });
    }
    if (q.collection) and.push({ collection: q.collection });
    if (q.brand) and.push({ brand: { in: q.brand.split(',') } });
    if (q.featured === 'true') and.push({ isFeatured: true });
    if (q.isNew === 'true') and.push({ isNewArrival: true });
    if (q.bestSeller === 'true') and.push({ isBestSeller: true });
    if (q.onSale === 'true') and.push({ salePriceMinor: { not: null } });
    if (q.minRating) and.push({ ratingAvg: { gte: Number(q.minRating) || 0 } });

    const min = Number(q.minPrice);
    const max = Number(q.maxPrice);
    if (q.minPrice && Number.isFinite(min)) and.push({ currentPriceMinor: { gte: min } });
    if (q.maxPrice && Number.isFinite(max)) and.push({ currentPriceMinor: { lte: max } });

    const variantFilter: Prisma.ProductVariantWhereInput = {};
    if (q.size) variantFilter.size = { in: q.size.split(',') };
    if (q.color) variantFilter.color = { in: q.color.split(',') };
    if (q.inStock === 'true') variantFilter.stock = { gt: 0 };
    if (Object.keys(variantFilter).length) and.push({ variants: { some: variantFilter } });

    if (q.q?.trim()) {
      for (const term of q.q.trim().split(/\s+/).slice(0, 6)) {
        const c = { contains: term, mode: 'insensitive' as const };
        and.push({
          OR: [
            { name: c },
            { nameAr: c },
            { description: c },
            { brand: c },
            { material: c },
            { collection: c },
            { category: { name: c } },
            { category: { parent: { name: c } } },
            { attributes: { some: { value: c } } },
          ],
        });
      }
    }
    return { AND: and };
  }

  async list(q: ListQuery) {
    const page = Math.max(1, parseInt(q.page || '1', 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(q.limit || '12', 10) || 12));
    const where = await this.where(q);
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      {
        price_asc: [{ currentPriceMinor: 'asc' as const }],
        price_desc: [{ currentPriceMinor: 'desc' as const }],
        popular: [{ soldCount: 'desc' as const }, { createdAt: 'desc' as const }],
        rating: [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }],
        newest: [{ createdAt: 'desc' as const }],
      }[q.sort || 'newest'] ?? [{ createdAt: 'desc' }];

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: productInclude }),
    ]);
    return { items: items.map(toDto), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
  }

  /** Distinct filter options for the sidebar, scoped to the same non-facet filters. */
  async facets(q: ListQuery) {
    const where = await this.where({ ...q, size: undefined, color: undefined, brand: undefined, minPrice: undefined, maxPrice: undefined });
    const [variants, brands, price] = await Promise.all([
      this.prisma.productVariant.findMany({ where: { product: where }, select: { size: true, color: true }, distinct: ['size', 'color'] }),
      this.prisma.product.findMany({ where, select: { brand: true }, distinct: ['brand'] }),
      this.prisma.product.aggregate({ where, _min: { currentPriceMinor: true }, _max: { currentPriceMinor: true } }),
    ]);
    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
    return {
      sizes: uniq(variants.map((v) => v.size)),
      colors: uniq(variants.map((v) => v.color)),
      brands: uniq(brands.map((b) => b.brand)),
      minPrice: price._min.currentPriceMinor ?? 0,
      maxPrice: price._max.currentPriceMinor ?? 0,
    };
  }

  async suggest(q: string) {
    if (!q || q.trim().length < 2) return { products: [], categories: [] };
    const c = { contains: q.trim(), mode: 'insensitive' as const };
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true, OR: [{ name: c }, { nameAr: c }, { brand: c }, { category: { name: c } }] },
        take: 6,
        orderBy: { soldCount: 'desc' },
        include: productInclude,
      }),
      this.prisma.category.findMany({ where: { name: c }, take: 4, select: { name: true, slug: true } }),
    ]);
    return { products: products.map(toDto), categories };
  }

  async bySlug(slug: string) {
    const p = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { ...productInclude, attributes: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    const related = await this.prisma.product.findMany({
      where: { isActive: true, id: { not: p.id }, OR: [{ categoryId: p.categoryId }, { audience: p.audience, collection: p.collection ?? undefined }] },
      take: 4,
      orderBy: { soldCount: 'desc' },
      include: productInclude,
    });
    return {
      ...toDto(p),
      attributes: p.attributes.map((a) => ({ key: a.key, value: a.value })),
      related: related.map(toDto),
    };
  }

  async byIds(ids: string[]) {
    if (!ids.length) return [];
    const items = await this.prisma.product.findMany({ where: { id: { in: ids.slice(0, 24) }, isActive: true }, include: productInclude });
    return ids.map((id) => items.find((p) => p.id === id)).filter(Boolean).map((p) => toDto(p!));
  }

  async reviews(productId: string) {
    const rows = await this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true } } },
    });
    return rows.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.user.name.split(' ')[0], createdAt: r.createdAt }));
  }

  async addReview(userId: string, productId: string, rating: number, title: string | undefined, body: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const purchased = await this.prisma.orderItem.findFirst({
      where: { variant: { productId }, order: { userId, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
    });
    if (!purchased) throw new BadRequestException('Only customers who purchased this product can review it');
    await this.prisma.$transaction(async (tx) => {
      await tx.review.upsert({
        where: { productId_userId: { productId, userId } },
        create: { productId, userId, rating, title: clean(title), body: clean(body)! },
        update: { rating, title: clean(title), body: clean(body)! },
      });
      const agg = await tx.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true });
      await tx.product.update({ where: { id: productId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
    });
  }
}
