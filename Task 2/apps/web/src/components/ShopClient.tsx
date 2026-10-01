'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import { api, Category, Product } from '@/lib/api';
import { catName } from './Header';
import ProductCard from './ProductCard';
import { usePrefs } from './providers';

interface Facets { sizes: string[]; colors: string[]; brands: string[]; minPrice: number; maxPrice: number }
interface Result { items: Product[]; total: number; page: number; pages: number }

const MULTI = ['size', 'color', 'brand'] as const;

export default function ShopClient({ preset = {}, title }: { preset?: Record<string, string>; title?: string }) {
  const { t, locale, money } = usePrefs();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [cats, setCats] = useState<Category[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [drawer, setDrawer] = useState(false);
  const [price, setPrice] = useState({ min: '', max: '' });

  const params = useMemo(() => {
    const o: Record<string, string> = {};
    sp.forEach((v, k) => { o[k] = v; });
    return { ...o, ...preset };
  }, [sp, preset]);

  const set = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v === null || v === '' ? next.delete(k) : next.set(k, v));
    if (!('page' in patch)) next.delete('page');
    router.replace(`${path}?${next}`, { scroll: false });
  }, [sp, router, path]);

  const toggleMulti = (key: string, value: string) => {
    const cur = (params[key] ?? '').split(',').filter(Boolean);
    set({ [key]: (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).join(',') });
  };

  useEffect(() => { api<Category[]>('/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => { setPrice({ min: params.minPrice ? String(Number(params.minPrice) / 100) : '', max: params.maxPrice ? String(Number(params.maxPrice) / 100) : '' }); }, [params.minPrice, params.maxPrice]);

  const qs = new URLSearchParams(params).toString();
  const baseQs = useMemo(() => {
    const b = new URLSearchParams();
    for (const k of ['category', 'audience', 'q', 'collection', 'onSale', 'isNew', 'bestSeller']) if (params[k]) b.set(k, params[k]);
    return b.toString();
  }, [params]);

  useEffect(() => {
    let off = false;
    setLoading(true); setError(false);
    api<Result>(`/products?${qs}&limit=12`)
      .then((r) => !off && setRes(r))
      .catch(() => !off && setError(true))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [qs]);
  useEffect(() => { api<Facets>(`/products/facets?${baseQs}`).then(setFacets).catch(() => {}); }, [baseQs]);

  const activeCat = useMemo(() => {
    for (const p of cats) { if (p.slug === params.category) return p; const c = p.children.find((k) => k.slug === params.category); if (c) return c; }
    return null;
  }, [cats, params.category]);

  const chosen = (k: string) => (params[k] ?? '').split(',').filter(Boolean);
  const filterCount = ['size', 'color', 'brand', 'minPrice', 'maxPrice', 'inStock', 'minRating'].filter((k) => params[k]).length;

  const sidebar = (
    <div className="space-y-7 text-sm">
      <fieldset>
        <legend className="label">{t('shop.category')}</legend>
        <ul className="space-y-1">
          <li><button className={`py-1 ${!params.category ? 'font-semibold text-brand' : ''}`} onClick={() => set({ category: null })}>All</button></li>
          {cats.map((p) => (
            <li key={p.id}>
              <button className={`py-1 ${params.category === p.slug ? 'font-semibold text-brand' : ''}`} onClick={() => set({ category: p.slug })}>{catName(p, locale)}</button>
              {(params.category === p.slug || p.children.some((c) => c.slug === params.category)) && (
                <ul className="ms-3 border-s border-ink/10 ps-3">
                  {p.children.map((c) => <li key={c.id}><button className={`py-0.5 text-ink-soft ${params.category === c.slug ? 'font-semibold text-brand' : ''}`} onClick={() => set({ category: c.slug })}>{catName(c, locale)}</button></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="label">{t('shop.price')} (NGN)</legend>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set({ minPrice: price.min ? String(Math.round(Number(price.min) * 100)) : null, maxPrice: price.max ? String(Math.round(Number(price.max) * 100)) : null }); }}>
          <input className="input !px-3 !py-2" inputMode="numeric" placeholder={facets ? String(Math.floor(facets.minPrice / 100)) : 'Min'} value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value.replace(/\D/g, '') })} aria-label="Minimum price" />
          <span>-</span>
          <input className="input !px-3 !py-2" inputMode="numeric" placeholder={facets ? String(Math.ceil(facets.maxPrice / 100)) : 'Max'} value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value.replace(/\D/g, '') })} aria-label="Maximum price" />
          <button className="btn-dark !px-4 !py-2">{t('common.apply')}</button>
        </form>
      </fieldset>

      {facets && facets.sizes.length > 0 && (
        <fieldset>
          <legend className="label">{t('shop.size')}</legend>
          <div className="flex flex-wrap gap-2">{facets.sizes.map((s) => <button key={s} aria-pressed={chosen('size').includes(s)} onClick={() => toggleMulti('size', s)} className={`chip !px-3 !py-1 ${chosen('size').includes(s) ? 'chip-on' : ''}`}>{s}</button>)}</div>
        </fieldset>
      )}
      {facets && facets.colors.length > 0 && (
        <fieldset>
          <legend className="label">{t('shop.color')}</legend>
          <div className="flex flex-wrap gap-2">{facets.colors.map((s) => <button key={s} aria-pressed={chosen('color').includes(s)} onClick={() => toggleMulti('color', s)} className={`chip !px-3 !py-1 ${chosen('color').includes(s) ? 'chip-on' : ''}`}>{s}</button>)}</div>
        </fieldset>
      )}
      {facets && facets.brands.length > 0 && (
        <fieldset>
          <legend className="label">{t('shop.brand')}</legend>
          <ul className="space-y-1.5">{facets.brands.map((b) => (
            <li key={b}><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={chosen('brand').includes(b)} onChange={() => toggleMulti('brand', b)} className="accent-brand" /> {b}</label></li>
          ))}</ul>
        </fieldset>
      )}
      <fieldset>
        <legend className="label">{t('shop.availability')}</legend>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={params.inStock === 'true'} onChange={(e) => set({ inStock: e.target.checked ? 'true' : null })} className="accent-brand" /> {t('shop.inStockOnly')}</label>
      </fieldset>
      <fieldset>
        <legend className="label">{t('shop.minRating')}</legend>
        <div className="flex gap-2">{[4, 3].map((r) => <button key={r} aria-pressed={params.minRating === String(r)} onClick={() => set({ minRating: params.minRating === String(r) ? null : String(r) })} className={`chip !px-3 !py-1 ${params.minRating === String(r) ? 'chip-on' : ''}`}>{r}+ ★</button>)}</div>
      </fieldset>
      {filterCount > 0 && <button className="text-brand underline" onClick={() => set(Object.fromEntries(['size', 'color', 'brand', 'minPrice', 'maxPrice', 'inStock', 'minRating'].map((k) => [k, null])))}>{t('shop.clear')}</button>}
    </div>
  );

  const heading = title ?? (params.q ? `"${params.q}"` : activeCat ? catName(activeCat, locale) : params.audience ? params.audience[0].toUpperCase() + params.audience.slice(1) : params.collection ? `${params.collection}` : t('shop.title'));

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl sm:text-5xl">{heading}</h1>
      {params.q && <p className="mt-2 text-ink-mute">Search results</p>}
      <div className="mt-8 grid gap-10 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block" aria-label={t('shop.filters')}>{sidebar}</aside>
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="btn-outline !px-4 !py-2 lg:hidden" onClick={() => setDrawer(true)}><SlidersHorizontal size={16} /> {t('shop.filters')}{filterCount ? ` (${filterCount})` : ''}</button>
              <p className="text-sm text-ink-mute" aria-live="polite">{res ? t('shop.results', { n: res.total }) : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="sort">{t('shop.sort')}</label>
              <select id="sort" className="input !w-auto !py-2" value={params.sort ?? 'newest'} onChange={(e) => set({ sort: e.target.value })}>
                <option value="newest">{t('shop.newest')}</option><option value="price_asc">{t('shop.priceLow')}</option><option value="price_desc">{t('shop.priceHigh')}</option>
                <option value="popular">{t('shop.popular')}</option><option value="rating">{t('shop.rating')}</option>
              </select>
              <div className="hidden overflow-hidden rounded-full border border-ink/20 sm:flex">
                <button aria-label={t('shop.grid')} aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`p-2.5 ${view === 'grid' ? 'bg-ink text-white' : ''}`}><LayoutGrid size={16} /></button>
                <button aria-label={t('shop.list')} aria-pressed={view === 'list'} onClick={() => setView('list')} className={`p-2.5 ${view === 'list' ? 'bg-ink text-white' : ''}`}><List size={16} /></button>
              </div>
            </div>
          </div>

          {error ? (
            <div role="alert" className="card p-10 text-center"><p className="font-serif text-xl">{t('shop.error')}</p><button className="btn-dark mt-4" onClick={() => router.refresh()}>{t('common.retry')}</button></div>
          ) : loading && !res ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div>
          ) : res && res.items.length === 0 ? (
            <div className="card p-12 text-center" data-testid="empty-state"><p className="font-serif text-2xl">{t('shop.empty')}</p><p className="mt-2 text-ink-mute">{t('shop.emptySub')}</p>
              <button className="btn-dark mt-6" onClick={() => router.replace(path)}>{t('shop.clear')}</button></div>
          ) : (
            <>
              <div className={`${loading ? 'opacity-60' : ''} transition ${view === 'grid' ? 'grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3' : 'space-y-4'}`}>
                {res?.items.map((p) => <ProductCard key={p.id} p={p} list={view === 'list'} />)}
              </div>
              {res && res.pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button className="btn-outline !px-4 !py-2" disabled={res.page <= 1} onClick={() => { set({ page: String(res.page - 1) }); window.scrollTo({ top: 0 }); }}>{t('shop.prev')}</button>
                  <span className="px-3 text-sm">{res.page} / {res.pages}</span>
                  <button className="btn-outline !px-4 !py-2" disabled={res.page >= res.pages} onClick={() => { set({ page: String(res.page + 1) }); window.scrollTo({ top: 0 }); }}>{t('shop.next')}</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[55] lg:hidden" role="dialog" aria-modal="true" aria-label={t('shop.filters')}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 end-0 w-[88%] max-w-sm overflow-y-auto bg-cream p-5">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl">{t('shop.filters')}</h2><button aria-label="Close filters" onClick={() => setDrawer(false)}><X /></button></div>
            {sidebar}
            <button className="btn-dark mt-8 w-full" onClick={() => setDrawer(false)}>{res ? t('shop.results', { n: res.total }) : t('common.apply')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
