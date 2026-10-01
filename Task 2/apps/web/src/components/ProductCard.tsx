'use client';

import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { Product } from '@/lib/api';
import { usePrefs, useWishlist } from './providers';

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-mute" aria-label={`Rated ${value} out of 5`}>
      <Star size={13} className="fill-amber-500 text-amber-500" aria-hidden />
      {value ? value.toFixed(1) : '-'}
      {count !== undefined && <span>({count})</span>}
    </span>
  );
}

export function Price({ p, className = '' }: { p: Pick<Product, 'priceMinor' | 'currentPriceMinor' | 'onSale'>; className?: string }) {
  const { money } = usePrefs();
  return (
    <span className={`flex items-baseline gap-2 ${className}`}>
      <span className="font-semibold">{money(p.currentPriceMinor)}</span>
      {p.onSale && <span className="text-sm text-ink-mute line-through">{money(p.priceMinor)}</span>}
    </span>
  );
}

export default function ProductCard({ p, list = false }: { p: Product; list?: boolean }) {
  const { t, locale } = usePrefs();
  const wish = useWishlist();
  const on = wish.has(p.id);
  const name = locale === 'ar' && p.nameAr ? p.nameAr : p.name;
  const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))];
  return (
    <article className={`group card overflow-hidden ${list ? 'flex' : ''}`} data-testid="product-card">
      <div className={`relative overflow-hidden bg-cream-100 ${list ? 'w-40 shrink-0 sm:w-56' : ''}`}>
        <Link href={`/product/${p.slug}`} tabIndex={-1} aria-hidden>
          <img
            src={p.images[0]?.url} alt={p.images[0]?.alt ?? name} loading="lazy"
            className={`w-full object-cover transition duration-500 group-hover:scale-105 ${list ? 'h-full' : 'aspect-[4/5]'}`}
          />
        </Link>
        <div className="absolute start-3 top-3 flex flex-col gap-1.5">
          {p.onSale && <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-white">{t('common.sale')}</span>}
          {p.isNewArrival && !p.onSale && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">{t('common.new')}</span>}
          {!p.inStock && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink">{t('badge.sold')}</span>}
        </div>
        <button
          onClick={() => wish.toggle(p.id)} aria-pressed={on} aria-label={t('nav.wishlist')}
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow transition hover:scale-110"
        >
          <Heart size={17} className={on ? 'fill-brand text-brand' : 'text-ink'} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] uppercase tracking-wide text-ink-mute">{p.brand ?? p.category.name}</p>
        <h3 className="font-sans text-[15px] font-medium leading-snug">
          <Link href={`/product/${p.slug}`} className="hover:text-brand">{name}</Link>
        </h3>
        <Stars value={p.ratingAvg} count={p.ratingCount} />
        {list && <p className="line-clamp-2 hidden text-sm text-ink-soft sm:block">{p.description}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 pt-1">
          <Price p={p} />
          {colors.length > 1 && <span className="hidden text-xs text-ink-mute sm:inline">{colors.length} {t('shop.color').toLowerCase()}s</span>}
        </div>
      </div>
    </article>
  );
}
