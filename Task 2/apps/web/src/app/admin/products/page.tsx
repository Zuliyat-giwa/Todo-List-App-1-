'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Download, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/providers';
import { api, Category, Product } from '@/lib/api';
import { fromMinor, ngn, toMinor } from '@/lib/format';

interface VariantForm { id?: string; sku: string; size: string; color: string; priceMinor: string; stock: string }
interface Form {
  id?: string; name: string; nameAr: string; description: string; descriptionAr: string; categoryId: string; audience: string; brand: string; material: string; collection: string;
  price: string; salePrice: string; baseSku: string; isFeatured: boolean; isNewArrival: boolean; isBestSeller: boolean; isActive: boolean;
  images: { url: string; alt: string }[]; variants: VariantForm[]; attributes: { key: string; value: string }[];
}
const blank: Form = {
  name: '', nameAr: '', description: '', descriptionAr: '', categoryId: '', audience: 'UNISEX', brand: '', material: '', collection: '', price: '', salePrice: '', baseSku: '',
  isFeatured: false, isNewArrival: false, isBestSeller: false, isActive: true, images: [{ url: '', alt: '' }], variants: [{ sku: '', size: '', color: '', priceMinor: '', stock: '0' }], attributes: [],
};

function toForm(p: Product): Form {
  return {
    id: p.id, name: p.name, nameAr: p.nameAr ?? '', description: p.description, descriptionAr: p.descriptionAr ?? '', categoryId: p.category.id, audience: p.audience, brand: p.brand ?? '', material: p.material ?? '',
    collection: p.collection ?? '', price: fromMinor(p.priceMinor), salePrice: p.salePriceMinor ? fromMinor(p.salePriceMinor) : '', baseSku: p.sku, isFeatured: p.isFeatured, isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller, isActive: p.isActive ?? true, images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? '' })),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size ?? '', color: v.color ?? '', priceMinor: v.priceMinor !== p.currentPriceMinor ? fromMinor(v.priceMinor) : '', stock: String(v.stock) })), attributes: p.attributes ?? [],
  };
}

function Editor({ initial, categories, onClose, onSaved }: { initial: Form; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = {
      name: f.name, nameAr: f.nameAr || undefined, description: f.description, descriptionAr: f.descriptionAr || undefined, categoryId: f.categoryId, audience: f.audience,
      brand: f.brand || undefined, material: f.material || undefined, collection: f.collection || undefined, priceMinor: toMinor(f.price), salePriceMinor: f.salePrice ? toMinor(f.salePrice) : null,
      baseSku: f.baseSku, isFeatured: f.isFeatured, isNewArrival: f.isNewArrival, isBestSeller: f.isBestSeller, isActive: f.isActive,
      images: f.images.filter((i) => i.url).map((i) => ({ url: i.url, alt: i.alt || undefined })),
      variants: f.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size || undefined, color: v.color || undefined, priceMinor: v.priceMinor ? toMinor(v.priceMinor) : undefined, stock: Number(v.stock) || 0 })),
      attributes: f.attributes.filter((a) => a.key && a.value),
    };
    try {
      await api(f.id ? `/admin/products/${f.id}` : '/admin/products', { method: f.id ? 'PUT' : 'POST', json: body });
      toast(f.id ? 'Product updated' : 'Product created');
      onSaved();
    } catch (err: any) { toast(err.message, 'err'); } finally { setBusy(false); }
  };

  const upload = async (i: number, file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      const imgs = [...f.images]; imgs[i] = { ...imgs[i], url: j.url.replace(/^https?:\/\/[^/]+/, '') }; set('images', imgs);
    } catch (e: any) { toast(e.message || 'Upload failed', 'err'); }
  };

  const flat = categories.flatMap((p) => [{ id: p.id, name: p.name, depth: 0 }, ...p.children.map((c) => ({ id: c.id, name: c.name, depth: 1 }))]);
  const T = (label: string, k: keyof Form, props: any = {}) => (
    <div><label className="label" htmlFor={`pf-${k}`}>{label}</label><input id={`pf-${k}`} className="input" value={f[k] as string} onChange={(e) => set(k, e.target.value as any)} {...props} /></div>
  );

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Product editor">
      <form onSubmit={save} className="card mx-auto my-6 max-w-4xl space-y-6 p-6 sm:p-8">
        <div className="flex items-center justify-between"><h2 className="text-2xl">{f.id ? 'Edit product' : 'New product'}</h2><button type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {T('Name', 'name', { required: true })}{T('Name (Arabic)', 'nameAr', { dir: 'rtl' })}
          <div><label className="label" htmlFor="pf-cat">Category</label>
            <select id="pf-cat" className="input" required value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}><option value="">Select...</option>{flat.map((c) => <option key={c.id} value={c.id}>{c.depth ? '- ' : ''}{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="pf-aud">Audience</label>
            <select id="pf-aud" className="input" value={f.audience} onChange={(e) => set('audience', e.target.value)}>{['WOMEN', 'MEN', 'KIDS', 'BOYS', 'GIRLS', 'UNISEX'].map((a) => <option key={a}>{a}</option>)}</select></div>
          {T('Price (NGN)', 'price', { required: true, type: 'number', min: 0, step: '0.01' })}{T('Sale price (NGN)', 'salePrice', { type: 'number', min: 0, step: '0.01' })}
          {T('Base SKU', 'baseSku', { required: true })}{T('Brand', 'brand')}{T('Material', 'material')}{T('Collection (e.g. Eid, Ramadan)', 'collection')}
        </div>
        <div><label className="label" htmlFor="pf-desc">Description</label><textarea id="pf-desc" required minLength={5} className="input min-h-28" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div><label className="label" htmlFor="pf-descar">Description (Arabic)</label><textarea id="pf-descar" dir="rtl" className="input min-h-20" value={f.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} /></div>
        <div className="flex flex-wrap gap-5 text-sm">
          {([['isActive', 'Active'], ['isFeatured', 'Featured'], ['isNewArrival', 'New arrival'], ['isBestSeller', 'Best seller']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /> {l}</label>
          ))}
        </div>

        <fieldset className="space-y-3"><legend className="label">Images</legend>
          {f.images.map((im, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              {im.url && <img src={im.url} alt="" className="h-12 w-10 rounded object-cover" />}
              <input className="input min-w-0 flex-1" placeholder="Image URL or /path" aria-label={`Image ${i + 1} URL`} value={im.url} onChange={(e) => { const a = [...f.images]; a[i] = { ...a[i], url: e.target.value }; set('images', a); }} />
              <label className="btn-outline cursor-pointer !px-4 !py-2">Upload<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => upload(i, e.target.files?.[0])} /></label>
              <button type="button" aria-label="Remove image" onClick={() => set('images', f.images.filter((_, n) => n !== i))}><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" className="text-sm text-brand" onClick={() => set('images', [...f.images, { url: '', alt: '' }])}><Plus size={14} className="inline" /> Add image</button>
        </fieldset>

        <fieldset className="space-y-3"><legend className="label">Variants and inventory</legend>
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_.8fr_auto] gap-2 text-xs text-ink-mute sm:grid"><span>SKU</span><span>Size</span><span>Color</span><span>Price override</span><span>Stock</span><span /></div>
          {f.variants.map((v, i) => {
            const up = (k: keyof VariantForm, val: string) => { const a = [...f.variants]; a[i] = { ...a[i], [k]: val }; set('variants', a); };
            return (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_.8fr_auto]">
                <input className="input !py-2" required placeholder="SKU" aria-label="Variant SKU" value={v.sku} onChange={(e) => up('sku', e.target.value)} />
                <input className="input !py-2" placeholder="Size" aria-label="Variant size" value={v.size} onChange={(e) => up('size', e.target.value)} />
                <input className="input !py-2" placeholder="Color" aria-label="Variant color" value={v.color} onChange={(e) => up('color', e.target.value)} />
                <input className="input !py-2" placeholder="Price (opt.)" type="number" min={0} aria-label="Variant price override" value={v.priceMinor} onChange={(e) => up('priceMinor', e.target.value)} />
                <input className="input !py-2" required type="number" min={0} aria-label="Variant stock" value={v.stock} onChange={(e) => up('stock', e.target.value)} />
                <button type="button" aria-label="Remove variant" onClick={() => set('variants', f.variants.filter((_, n) => n !== i))}><Trash2 size={16} /></button>
              </div>
            );
          })}
          <button type="button" className="text-sm text-brand" onClick={() => set('variants', [...f.variants, { sku: '', size: '', color: '', priceMinor: '', stock: '0' }])}><Plus size={14} className="inline" /> Add variant</button>
        </fieldset>

        <fieldset className="space-y-3"><legend className="label">Specifications (author, volume, origin, storage...)</legend>
          {f.attributes.map((a, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <input className="input !py-2" placeholder="Name" aria-label="Attribute name" value={a.key} onChange={(e) => { const x = [...f.attributes]; x[i] = { ...x[i], key: e.target.value }; set('attributes', x); }} />
              <input className="input !py-2" placeholder="Value" aria-label="Attribute value" value={a.value} onChange={(e) => { const x = [...f.attributes]; x[i] = { ...x[i], value: e.target.value }; set('attributes', x); }} />
              <button type="button" aria-label="Remove attribute" onClick={() => set('attributes', f.attributes.filter((_, n) => n !== i))}><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" className="text-sm text-brand" onClick={() => set('attributes', [...f.attributes, { key: '', value: '' }])}><Plus size={14} className="inline" /> Add specification</button>
        </fieldset>

        <div className="flex justify-end gap-3"><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-dark" disabled={busy}>{busy ? 'Saving...' : 'Save product'}</button></div>
      </form>
    </div>
  );
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Product[] } | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [edit, setEdit] = useState<Form | null>(null);
  const load = useCallback(() => api<{ total: number; items: Product[] }>(`/admin/products?page=${page}&q=${encodeURIComponent(q)}`).then(setData).catch((e) => toast(e.message, 'err')), [page, q, toast]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);
  useEffect(() => { api<Category[]>('/admin/categories').then(setCats).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Products</h1>
        <div className="flex gap-2">
          <a href="/api/admin/products/export.csv" className="btn-outline"><Download size={15} /> Export CSV</a>
          <button className="btn-dark" onClick={() => setEdit(blank)} data-testid="new-product"><Plus size={15} /> New product</button>
        </div>
      </div>
      <input className="input max-w-sm" placeholder="Search name or SKU" aria-label="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase text-ink-mute"><tr><th className="p-3 text-start">Product</th><th className="p-3 text-start">Category</th><th className="p-3 text-start">Price</th><th className="p-3 text-start">Stock</th><th className="p-3 text-start">Status</th><th /></tr></thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-b border-ink/5">
                <td className="flex items-center gap-3 p-3"><img src={p.images[0]?.url} alt="" className="h-12 w-10 rounded object-cover" /><span><span className="block font-medium">{p.name}</span><span className="text-xs text-ink-mute">{p.sku}</span></span></td>
                <td className="p-3">{p.category.name}</td>
                <td className="p-3">{ngn(p.currentPriceMinor)}</td>
                <td className="p-3">{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
                <td className="p-3">{p.isActive === false ? <span className="text-red-700">Hidden</span> : 'Active'}</td>
                <td className="space-x-3 p-3 text-end">
                  <button className="text-brand underline" onClick={async () => setEdit(toForm(await api<Product>(`/admin/products/${p.id}`)))}>Edit</button>
                  <button className="text-red-700 underline" onClick={async () => { if (confirm(`Delete "${p.name}"? Products with past orders are hidden instead.`)) { const r = await api<{ archived: boolean }>(`/admin/products/${p.id}`, { method: 'DELETE' }); toast(r.archived ? 'Product hidden (has orders)' : 'Product deleted'); load(); } }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && <div className="skeleton m-4 h-40" />}
      </div>
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn-outline !px-4 !py-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(data.total / 20)}</span>
          <button className="btn-outline !px-4 !py-2" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {edit && <Editor initial={edit} categories={cats} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}
