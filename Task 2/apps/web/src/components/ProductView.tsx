'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Heart, Minus, Plus, Ruler, Star, X } from 'lucide-react';
import { api, Product } from '@/lib/api';
import ProductCard, { Price, Stars } from './ProductCard';
import { useAuth, useCart, usePrefs, useToast, useWishlist } from './providers';

const CHARTS: Record<string, { head: string[]; rows: string[][] }> = {
  WOMEN: { head: ['Size', 'Length (in)', 'Bust (in)', 'Sleeve (in)'], rows: [['52', '52', '40', '22'], ['54', '54', '42', '22.5'], ['56', '56', '44', '23'], ['58', '58', '46', '23.5']] },
  MEN: { head: ['Size', 'Length (in)', 'Chest (in)', 'Sleeve (in)'], rows: [['52', '52', '44', '24'], ['54', '54', '46', '24.5'], ['56', '56', '48', '25'], ['58', '58', '50', '25.5']] },
  KIDS: { head: ['Age', 'Height (cm)', 'Chest (cm)', 'Length (cm)'], rows: [['2-3Y', '92-98', '53', '58'], ['4-5Y', '104-110', '56', '68'], ['6-7Y', '116-122', '60', '78'], ['8-9Y', '128-134', '64', '88'], ['10-11Y', '140-146', '68', '98']] },
};

function SizeGuide({ audience, onClose }: { audience: string; onClose: () => void }) {
  const key = audience === 'MEN' ? 'MEN' : ['KIDS', 'BOYS', 'GIRLS'].includes(audience) ? 'KIDS' : 'WOMEN';
  const c = CHARTS[key];
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative w-full max-w-lg p-6">
        <button onClick={onClose} aria-label="Close size guide" className="absolute end-4 top-4"><X size={20} /></button>
        <h2 className="text-2xl">Size guide</h2>
        <p className="mt-1 text-sm text-ink-mute">Measurements are of the garment. If you are between sizes, choose the larger one.</p>
        <table className="mt-4 w-full text-center text-sm">
          <thead><tr>{c.head.map((h) => <th key={h} className="border-b border-ink/15 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{c.rows.map((r) => <tr key={r[0]}>{r.map((v, i) => <td key={i} className="border-b border-ink/5 py-2">{v}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Gallery({ images, index, setIndex, name }: { images: Product['images']; index: number; setIndex: (n: number) => void; name: string }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const img = images[index];
  return (
    <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
      <div className="order-2 flex gap-2 sm:order-1 sm:flex-col">
        {images.map((im, i) => (
          <button key={i} onClick={() => setIndex(i)} aria-label={`Image ${i + 1}`} aria-current={i === index} className={`aspect-[4/5] w-16 overflow-hidden rounded-lg border-2 sm:w-full ${i === index ? 'border-ink' : 'border-transparent'}`}>
            <img src={im.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div
        ref={ref} data-testid="gallery-main"
        className="relative order-1 aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-cream-100 sm:order-2"
        onMouseMove={(e) => { const r = ref.current!.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onMouseLeave={() => setZoom(null)}
      >
        <img src={img?.url} alt={img?.alt ?? name} className="h-full w-full object-cover transition-transform duration-150" style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
      </div>
    </div>
  );
}

interface Review { id: string; rating: number; title: string | null; body: string; author: string; createdAt: string }

function Reviews({ product }: { product: Product }) {
  const { t } = usePrefs();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const load = () => api<Review[]>(`/products/${product.id}/reviews`).then(setItems).catch(() => {});
  useEffect(() => { load(); }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section id="reviews" className="mt-16">
      <h2 className="text-3xl">{t('pdp.reviews')}</h2>
      <div className="mt-6 grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {items.length === 0 && <p className="text-ink-mute">{t('pdp.noReviews')}</p>}
          {items.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-ink-mute">{new Date(r.createdAt).toLocaleDateString()}</span></div>
              {r.title && <h3 className="mt-2 font-sans font-semibold">{r.title}</h3>}
              <p className="mt-1 text-ink-soft">{r.body}</p>
              <p className="mt-2 text-xs text-ink-mute">{r.author}</p>
            </article>
          ))}
        </div>
        <form
          className="card h-fit space-y-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try { await api(`/products/${product.id}/reviews`, { method: 'POST', json: { rating, body } }); toast('Thanks for your review!'); setBody(''); load(); }
            catch (err: any) { toast(err.message, 'err'); }
          }}
        >
          <h3 className="font-sans font-semibold">{t('pdp.writeReview')}</h3>
          {!user ? <p className="text-sm text-ink-mute"><Link href="/login" className="text-brand underline">Sign in</Link> to review products you have purchased.</p> : (
            <>
              <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}><Star size={24} className={n <= rating ? 'fill-amber-500 text-amber-500' : 'text-ink/30'} /></button>
              ))}</div>
              <textarea className="input min-h-24" required minLength={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience" aria-label="Review" />
              <button className="btn-dark w-full">{t('common.save')}</button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

export default function ProductView({ p }: { p: Product }) {
  const { t, locale } = usePrefs();
  const cart = useCart();
  const wish = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [recent, setRecent] = useState<Product[]>([]);

  const sizes = useMemo(() => [...new Set(p.variants.map((v) => v.size).filter(Boolean))] as string[], [p]);
  const colors = useMemo(() => [...new Set(p.variants.map((v) => v.color).filter(Boolean))] as string[], [p]);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.find((c) => p.variants.some((v) => v.color === c && v.stock > 0)) ?? colors[0] ?? null); // first colour that is in stock is pre-selected
  const [qty, setQty] = useState(1);
  const [index, setIndex] = useState(0);
  const [guide, setGuide] = useState(false);
  const [tab, setTab] = useState<'desc' | 'details' | 'ship'>('desc');
  const [tried, setTried] = useState(false);

  const needSize = sizes.length > 0;
  const needColor = colors.length > 0;
  const variant = (needSize && !size) || (needColor && !color)
    ? undefined
    : p.variants.find((v) => (!needSize || v.size === size) && (!needColor || v.color === color));
  const ready = !!variant;
  const stock = variant?.stock ?? 0;
  const name = locale === 'ar' && p.nameAr ? p.nameAr : p.name;
  const desc = locale === 'ar' && p.descriptionAr ? p.descriptionAr : p.description;
  const isClothing = sizes.length > 0 && ['women', 'men', 'kids'].includes((p.category.parent?.slug ?? p.category.slug));

  const sizeAvailable = (s: string) => p.variants.some((v) => v.size === s && (!color || v.color === color) && v.stock > 0);
  const colorAvailable = (c: string) => p.variants.some((v) => v.color === c && (!size || v.size === size) && v.stock > 0);

  const pickColor = (c: string) => {
    setColor(c);
    const i = p.images.findIndex((im) => im.alt?.endsWith(c) || im.alt?.includes(`- ${c}`));
    if (i >= 0) setIndex(i);
  };

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('modeza.recent') ?? '[]').filter((x: string) => x !== p.id);
      if (ids.length) api<Product[]>(`/products/by-ids?ids=${ids.slice(0, 4).join(',')}`).then(setRecent).catch(() => {});
      localStorage.setItem('modeza.recent', JSON.stringify([p.id, ...ids].slice(0, 12)));
    } catch { /* ignore */ }
    if (user) api(`/account/recently-viewed/${p.id}`, { method: 'POST' }).catch(() => {});
  }, [p.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (buyNow = false) => {
    setTried(true);
    if (!variant) {
      const missing = needColor && !color ? 'colour' : 'size';
      toast(`Please choose a ${missing} first`, 'err');
      document.getElementById(missing === 'size' ? 'opt-size' : 'opt-color')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (stock < 1) { toast(t('common.outOfStock'), 'err'); return; }
    const inCart = cart.items.find((i) => i.variantId === variant.id)?.quantity ?? 0;
    if (inCart + qty > stock) { toast(`Only ${stock} available`, 'err'); return; }
    cart.add(variant.id, qty);
    if (buyNow) router.push('/checkout');
    else { toast(t('pdp.added')); cart.setOpen(true); }
  };

  const specs: [string, string][] = [
    [t('pdp.sku'), variant?.sku ?? p.sku],
    ...(p.brand ? [[t('shop.brand'), p.brand] as [string, string]] : []),
    ...(p.material ? [[t('pdp.material'), p.material] as [string, string]] : []),
    [t('shop.category'), [p.category.parent?.name, p.category.name].filter(Boolean).join(' / ')],
    ...((p.attributes ?? []).map((a) => [a.key, a.value] as [string, string])),
  ];

  return (
    <div className="container-x py-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-mute">
        <Link href="/" className="hover:text-ink">Home</Link> / {p.category.parent && <><Link href={`/shop?category=${p.category.parent.slug}`} className="hover:text-ink">{p.category.parent.name}</Link> / </>}
        <Link href={`/shop?category=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={p.images} index={index} setIndex={setIndex} name={name} />
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-mute">{p.brand}</p>
          <h1 className="mt-1 text-4xl leading-tight">{name}</h1>
          <a href="#reviews" className="mt-3 inline-block"><Stars value={p.ratingAvg} count={p.ratingCount} /></a>
          <Price p={{ ...p, currentPriceMinor: variant?.priceMinor ?? p.currentPriceMinor }} className="mt-4 text-2xl" />

          {colors.length > 0 && (
            <fieldset id="opt-color" className={`mt-7 rounded-xl ${tried && needColor && !color ? 'ring-2 ring-red-400 ring-offset-4' : ''}`}>
              <legend className="label">{t('pdp.color')}{color ? `: ${color}` : ''}</legend>
              <div className="flex flex-wrap gap-2">{colors.map((c) => (
                <button key={c} aria-pressed={color === c} onClick={() => pickColor(c)} className={`chip ${color === c ? 'chip-on' : ''} ${!colorAvailable(c) ? 'opacity-50 line-through' : ''}`}>{c}</button>
              ))}</div>
            </fieldset>
          )}
          {sizes.length > 0 && (
            <fieldset id="opt-size" className={`mt-5 rounded-xl ${tried && needSize && !size ? 'ring-2 ring-red-400 ring-offset-4' : ''}`}>
              <legend className="label flex w-full items-center justify-between gap-3"><span>{t('pdp.size')}{size ? `: ${size}` : ''}</span>
                {isClothing && <button type="button" onClick={() => setGuide(true)} className="inline-flex items-center gap-1 normal-case text-brand underline"><Ruler size={13} /> {t('pdp.sizeGuide')}</button>}</legend>
              <div className="flex flex-wrap gap-2">{sizes.map((s) => (
                <button key={s} aria-pressed={size === s} onClick={() => setSize(s)} className={`chip ${size === s ? 'chip-on' : ''} ${!sizeAvailable(s) ? 'opacity-50 line-through' : ''}`}>{s}</button>
              ))}</div>
            </fieldset>
          )}
          {tried && !ready && <p role="alert" className="mt-3 text-sm font-medium text-red-700">Please choose a {needColor && !color ? 'colour' : 'size'} to continue.</p>}

          <p className="mt-5 text-sm" data-testid="stock-status">
            {!ready ? <span className="text-ink-mute">{p.inStock ? t('common.inStock') : t('common.outOfStock')}</span>
              : stock < 1 ? <span className="font-medium text-red-700">{t('common.outOfStock')}</span>
              : stock <= 5 ? <span className="font-medium text-amber-700">{t('common.lowStock', { n: stock })}</span>
              : <span className="inline-flex items-center gap-1 text-emerald-700"><Check size={14} /> {t('common.inStock')}</span>}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-ink/25">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity" className="p-3.5"><Minus size={15} /></button>
              <span className="w-8 text-center" aria-live="polite" aria-label={t('pdp.qty')}>{qty}</span>
              <button onClick={() => setQty(Math.min(ready ? Math.max(stock, 1) : 99, qty + 1))} aria-label="Increase quantity" className="p-3.5"><Plus size={15} /></button>
            </div>
            <button className="btn-dark flex-1" onClick={() => add(false)} disabled={ready && stock < 1}>{ready && stock < 1 ? t('common.outOfStock') : t('common.addToCart')}</button>
            <button onClick={() => wish.toggle(p.id)} aria-pressed={wish.has(p.id)} aria-label={t('nav.wishlist')} className="grid h-12 w-12 place-items-center rounded-full border border-ink/25 hover:border-ink"><Heart size={19} className={wish.has(p.id) ? 'fill-brand text-brand' : ''} /></button>
          </div>
          <button className="btn-brand mt-3 w-full" onClick={() => add(true)} disabled={ready && stock < 1}>{t('common.buyNow')}</button>

          <div className="mt-8 border-t border-ink/10">
            <div role="tablist" className="flex gap-6 border-b border-ink/10">
              {([['desc', 'pdp.description'], ['details', 'pdp.details'], ['ship', 'pdp.shipping']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 py-3 text-sm font-medium ${tab === k ? 'border-brand text-brand' : 'border-transparent text-ink-mute'}`}>{t(l)}</button>
              ))}
            </div>
            <div role="tabpanel" className="py-5 text-sm leading-relaxed text-ink-soft">
              {tab === 'desc' && <p>{desc}</p>}
              {tab === 'details' && <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5">{specs.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-mute">{k}</dt><dd>{v}</dd></div>)}</dl>}
              {tab === 'ship' && <div className="space-y-3"><p>{t('pdp.shipInfo')}</p><p>{t('pdp.returnInfo')}</p></div>}
            </div>
          </div>
        </div>
      </div>

      <Reviews product={p} />

      {p.related && p.related.length > 0 && (
        <section className="mt-16"><h2 className="mb-6 text-3xl">{t('pdp.related')}</h2><div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</div></section>
      )}
      {recent.length > 0 && (
        <section className="mt-16"><h2 className="mb-6 text-3xl">{t('pdp.recent')}</h2><div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{recent.map((r) => <ProductCard key={r.id} p={r} />)}</div></section>
      )}
      {guide && <SizeGuide audience={p.audience} onClose={() => setGuide(false)} />}
    </div>
  );
}
