'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/providers';
import { api } from '@/lib/api';

interface Banner { id: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string; placement: string; sortOrder: number; isActive: boolean }
interface Faq { id: string; question: string; answer: string; sortOrder: number }

function Banners() {
  const { toast } = useToast();
  const [list, setList] = useState<Banner[]>([]);
  const [f, setF] = useState({ title: '', subtitle: '', ctaLabel: '', ctaHref: '', imageUrl: '', placement: 'promo' });
  const load = useCallback(() => api<Banner[]>('/admin/banners').then(setList).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    try { await api('/admin/banners', { method: 'POST', json: { ...f, subtitle: f.subtitle || undefined, ctaLabel: f.ctaLabel || undefined, ctaHref: f.ctaHref || undefined, sortOrder: list.length } }); toast('Banner added'); setF({ ...f, title: '', subtitle: '', imageUrl: '' }); load(); } catch (er: any) { toast(er.message, 'err'); }
  };
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Homepage banners and promotions</h2>
      <ul className="space-y-3">{list.map((b) => (
        <li key={b.id} className="card flex items-center gap-4 p-4 text-sm">
          <img src={b.imageUrl} alt="" className="h-16 w-14 rounded object-cover" />
          <div className="flex-1"><p className="font-medium">{b.title} <span className="rounded-full bg-cream-200 px-2 py-0.5 text-xs">{b.placement}</span></p><p className="text-ink-mute">{b.subtitle}</p></div>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={b.isActive} onChange={async (e) => { await api(`/admin/banners/${b.id}`, { method: 'PUT', json: { ...b, isActive: e.target.checked, id: undefined } }).catch((er) => toast(er.message, 'err')); load(); }} /> Active</label>
          <button className="text-red-700 underline" onClick={async () => { await api(`/admin/banners/${b.id}`, { method: 'DELETE' }); load(); }}>Delete</button>
        </li>))}</ul>
      <form onSubmit={add} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div><label className="label" htmlFor="b-title">Title</label><input id="b-title" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="b-place">Placement</label><select id="b-place" className="input" value={f.placement} onChange={(e) => setF({ ...f, placement: e.target.value })}><option value="hero">Hero</option><option value="promo">Promo</option></select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="b-sub">Subtitle</label><input id="b-sub" className="input" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></div>
        <div><label className="label" htmlFor="b-cta">Button label</label><input id="b-cta" className="input" value={f.ctaLabel} onChange={(e) => setF({ ...f, ctaLabel: e.target.value })} /></div>
        <div><label className="label" htmlFor="b-href">Button link</label><input id="b-href" className="input" placeholder="/shop?collection=Eid" value={f.ctaHref} onChange={(e) => setF({ ...f, ctaHref: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="b-img">Image URL</label><input id="b-img" className="input" required value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} /></div>
        <div><button className="btn-dark">Add banner</button></div>
      </form>
    </section>
  );
}

function Faqs() {
  const { toast } = useToast();
  const [list, setList] = useState<Faq[]>([]);
  const [f, setF] = useState({ question: '', answer: '' });
  const load = useCallback(() => api<Faq[]>('/content/faqs').then(setList).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">FAQs</h2>
      <ul className="space-y-2">{list.map((q) => <li key={q.id} className="card flex justify-between gap-4 p-4 text-sm"><span><strong>{q.question}</strong><br /><span className="text-ink-soft">{q.answer}</span></span><button className="text-red-700 underline" onClick={async () => { await api(`/admin/faqs/${q.id}`, { method: 'DELETE' }); load(); }}>Delete</button></li>)}</ul>
      <form className="card space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); try { await api('/admin/faqs', { method: 'POST', json: { ...f, sortOrder: list.length } }); setF({ question: '', answer: '' }); load(); toast('FAQ added'); } catch (er: any) { toast(er.message, 'err'); } }}>
        <input className="input" required placeholder="Question" aria-label="Question" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
        <textarea className="input min-h-20" required placeholder="Answer" aria-label="Answer" value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />
        <button className="btn-dark">Add FAQ</button>
      </form>
    </section>
  );
}

function Policies() {
  const { toast } = useToast();
  const [all, setAll] = useState<Record<string, { title: string; body: string }>>({});
  useEffect(() => { api<Record<string, { title: string; body: string }>>('/content/policies').then(setAll).catch(() => {}); }, []);
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Store policies</h2>
      {Object.entries(all).map(([key, p]) => (
        <form key={key} className="card space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); try { await api(`/admin/policies/${key}`, { method: 'PUT', json: p }); toast('Policy saved'); } catch (er: any) { toast(er.message, 'err'); } }}>
          <input className="input font-semibold" aria-label={`${key} title`} value={p.title} onChange={(e) => setAll({ ...all, [key]: { ...p, title: e.target.value } })} />
          <textarea className="input min-h-28" aria-label={`${key} text`} value={p.body} onChange={(e) => setAll({ ...all, [key]: { ...p, body: e.target.value } })} />
          <button className="btn-dark !px-5 !py-2">Save {key}</button>
        </form>
      ))}
    </section>
  );
}

export default function AdminContent() {
  return <div className="space-y-12"><h1 className="text-4xl">Content</h1><Banners /><Faqs /><Policies /></div>;
}
