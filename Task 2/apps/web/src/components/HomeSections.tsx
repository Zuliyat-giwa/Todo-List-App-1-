'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Headphones, RotateCcw, ShieldCheck, Star, Truck, Play } from 'lucide-react';
import { Category, Product } from '@/lib/api';
import { catName } from './Header';
import { NewsletterForm } from './Footer';
import ProductCard from './ProductCard';
import { usePrefs } from './providers';

interface Banner { id: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string }

export function Hero({ banner }: { banner?: Banner }) {
  const { t } = usePrefs();
  return (
    <section className="container-x pt-8 lg:pt-12">
      <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-cream-100 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:px-16 lg:py-0">
        <div className="relative z-10 lg:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-brand">{t('hero.eyebrow')}</p>
          <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            {(banner?.title ?? 'Timeless Elegance').split(' ')[0]}
            <span className="block italic text-brand">{(banner?.title ?? 'Timeless Elegance').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="mt-6 max-w-md text-ink-soft">{banner?.subtitle ?? 'Minimal designs. Maximum impact.'}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={banner?.ctaHref ?? '/shop'} className="btn-dark">{banner?.ctaLabel ?? t('hero.cta')} <ArrowRight size={16} className="rtl:rotate-180" /></Link>
            <Link href="/sale" className="btn-outline"><Play size={14} aria-hidden /> {t('hero.secondary')}</Link>
          </div>
          <dl className="mt-10 flex gap-8 text-sm">
            <div><dt className="text-ink-mute">Happy customers</dt><dd className="font-serif text-2xl">10K+</dd></div>
            <div><dt className="text-ink-mute">Customer rating</dt><dd className="flex items-center gap-1 font-serif text-2xl"><Star size={18} className="fill-amber-500 text-amber-500" />4.9</dd></div>
          </dl>
        </div>
        <div className="relative mx-auto my-2 aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl bg-cream-200 lg:my-10 lg:max-w-none">
          <img src={banner?.imageUrl ?? ''} alt="" className="h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute end-4 top-4 flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-xs shadow"><ShieldCheck size={16} className="text-brand" /><span><strong className="block">Premium</strong><span className="text-ink-mute">Quality assured</span></span></div>
        </div>
      </div>
    </section>
  );
}

export function TrustBar() {
  const { t } = usePrefs();
  const items = [
    [Truck, 'trust.ship', 'trust.shipSub'], [RotateCcw, 'trust.returns', 'trust.returnsSub'], [ShieldCheck, 'trust.pay', 'trust.paySub'], [Headphones, 'trust.support', 'trust.supportSub'],
  ] as const;
  return (
    <section className="container-x mt-8">
      <ul className="card grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
        {items.map(([Icon, a, b]) => (
          <li key={a} className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream-100"><Icon size={19} /></span>
            <span><span className="block text-sm font-semibold">{t(a)}</span><span className="text-xs text-ink-mute">{t(b)}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SectionHead({ title, href, sub }: { title: string; href?: string; sub?: string }) {
  const { t } = usePrefs();
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl sm:text-4xl">{title}</h2>
        {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
      </div>
      {href && <Link href={href} className="shrink-0 border-b border-brand pb-0.5 text-sm font-medium text-brand">{t('nav.viewAll')} &rarr;</Link>}
    </div>
  );
}

export function CategoryRail({ categories }: { categories: Category[] }) {
  const { t, locale } = usePrefs();
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  return (
    <section className="container-x mt-16">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="text-3xl sm:text-4xl">{t('home.shopBy')} <em className="text-brand">{t('home.category')}</em></h2>
        <Link href="/shop" className="border-b border-brand pb-0.5 text-sm font-medium text-brand">{t('home.viewAllCats')} &rarr;</Link>
      </div>
      <div className="relative">
        <button onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute -start-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-card lg:grid"><ChevronLeft size={18} className="rtl:rotate-180" /></button>
        <div ref={ref} className="flex snap-x gap-5 overflow-x-auto pb-2 [scrollbar-width:none]">
          {categories.map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className="group relative aspect-[3/4] w-56 shrink-0 snap-start overflow-hidden rounded-2xl bg-cream-100 sm:w-64">
              <img src={c.imageUrl ?? ''} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 text-white">
                <h3 className="font-serif text-2xl">{catName(c, locale)}</h3>
                <p className="text-xs text-white/80">{c.children.reduce((n, k) => n + k.productCount, 0) + c.productCount} items</p>
              </div>
            </Link>
          ))}
        </div>
        <button onClick={() => scroll(1)} aria-label="Scroll right" className="absolute -end-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-card lg:grid"><ChevronRight size={18} className="rtl:rotate-180" /></button>
      </div>
    </section>
  );
}

export function ProductRow({ titleKey, products, href, limit = 4 }: { titleKey: string; products: Product[]; href: string; limit?: number }) {
  const { t } = usePrefs();
  if (!products.length) return null;
  return (
    <section className="container-x mt-20">
      <SectionHead title={t(titleKey)} href={href} />
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.slice(0, limit).map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

export function PromoBanner({ banner }: { banner?: Banner }) {
  if (!banner) return null;
  return (
    <section className="container-x mt-20">
      <div className="grid items-center overflow-hidden rounded-[2rem] bg-cream-200 md:grid-cols-2">
        <div className="p-8 sm:p-14">
          <p className="font-serif text-xl italic text-brand">Summer Sale</p>
          <h2 className="mt-2 text-4xl sm:text-5xl">Up to 50% Off</h2>
          <p className="mt-4 max-w-sm text-ink-soft">{banner.subtitle}</p>
          <Link href={banner.ctaHref ?? '/sale'} className="btn-dark mt-8">{banner.ctaLabel ?? 'Shop'} <ArrowRight size={16} className="rtl:rotate-180" /></Link>
        </div>
        <div className="relative min-h-72 self-stretch"><img src={banner.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></div>
      </div>
    </section>
  );
}

export function Seasonal({ banner }: { banner?: Banner }) {
  const { t } = usePrefs();
  if (!banner) return null;
  return (
    <section className="container-x mt-20">
      <Link href={banner.ctaHref ?? '/shop'} className="group relative block overflow-hidden rounded-[2rem] bg-brand text-white">
        <div className="grid items-center md:grid-cols-[1fr_320px]">
          <div className="p-8 sm:p-14">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/80">{t('home.seasonal')}</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{banner.title}</h2>
            <p className="mt-3 max-w-md text-white/85">{banner.subtitle}</p>
            <span className="mt-6 inline-flex items-center gap-2 border-b border-white pb-0.5 text-sm font-medium">{banner.ctaLabel} <ArrowRight size={15} className="rtl:rotate-180" /></span>
          </div>
          <img src={banner.imageUrl} alt="" loading="lazy" className="hidden h-72 w-full object-cover md:block" />
        </div>
      </Link>
    </section>
  );
}

export function Testimonials({ items }: { items: { id: string; rating: number; body: string; author: string; product: { name: string; slug: string } }[] }) {
  const { t } = usePrefs();
  if (!items.length) return null;
  return (
    <section className="container-x mt-20">
      <SectionHead title={t('home.testimonials')} />
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((r) => (
          <figure key={r.id} className="card p-7">
            <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>{Array.from({ length: r.rating }, (_, i) => <Star key={i} size={16} className="fill-amber-500 text-amber-500" />)}</div>
            <blockquote className="mt-4 text-ink-soft">&ldquo;{r.body}&rdquo;</blockquote>
            <figcaption className="mt-5 text-sm"><span className="font-semibold">{r.author}</span> <span className="text-ink-mute">on </span><Link href={`/product/${r.product.slug}`} className="text-brand">{r.product.name}</Link></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Newsletter() {
  const { t } = usePrefs();
  return (
    <section className="container-x mt-20">
      <div className="rounded-[2rem] bg-ink px-6 py-14 text-center text-white sm:px-14">
        <h2 className="text-3xl sm:text-4xl">{t('home.newsletter')}</h2>
        <p className="mx-auto mt-3 max-w-lg text-white/70">{t('home.newsletterSub')}</p>
        <div className="mt-8 flex justify-center"><NewsletterForm dark /></div>
      </div>
    </section>
  );
}

export function SocialGallery({ images }: { images: string[] }) {
  const { t } = usePrefs();
  return (
    <section className="container-x mt-20">
      <SectionHead title={t('home.social')} />
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {images.slice(0, 6).map((src, i) => (
          <div key={i} className="aspect-square overflow-hidden rounded-xl bg-cream-100"><img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-110" /></div>
        ))}
      </div>
    </section>
  );
}
