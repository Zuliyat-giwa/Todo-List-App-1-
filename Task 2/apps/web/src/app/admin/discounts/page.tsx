'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/providers';
import { api } from '@/lib/api';
import { ngn, toMinor } from '@/lib/format';

interface Discount { id: string; code: string; type: 'PERCENT' | 'FIXED'; value: number; minPurchaseMinor: number; usageLimit: number | null; usedCount: number; expiresAt: string | null; isActive: boolean }

export default function AdminDiscounts() {
  const { toast } = useToast();
  const [list, setList] = useState<Discount[] | null>(null);
  const [f, setF] = useState({ code: '', type: 'PERCENT', value: '10', min: '', limit: '', expires: '' });
  const load = useCallback(() => api<Discount[]>('/admin/discounts').then(setList).catch((e) => toast(e.message, 'err')), [toast]);
  useEffect(() => { load(); }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/admin/discounts', { method: 'POST', json: {
        code: f.code, type: f.type, value: f.type === 'FIXED' ? toMinor(f.value) : Number(f.value),
        minPurchaseMinor: f.min ? toMinor(f.min) : 0, usageLimit: f.limit ? Number(f.limit) : null, expiresAt: f.expires ? new Date(f.expires + 'T23:59:59').toISOString() : null,
      } });
      toast('Discount created'); setF({ ...f, code: '' }); load();
    } catch (err: any) { toast(err.message, 'err'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Discount codes</h1>
      <form onSubmit={create} className="card grid gap-4 p-6 sm:grid-cols-3">
        <div><label className="label" htmlFor="d-code">Code</label><input id="d-code" className="input" required minLength={3} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
        <div><label className="label" htmlFor="d-type">Type</label><select id="d-type" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount (NGN)</option></select></div>
        <div><label className="label" htmlFor="d-val">{f.type === 'PERCENT' ? 'Percent off' : 'Amount off (NGN)'}</label><input id="d-val" type="number" min={1} max={f.type === 'PERCENT' ? 100 : undefined} className="input" required value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
        <div><label className="label" htmlFor="d-min">Minimum purchase (NGN)</label><input id="d-min" type="number" min={0} className="input" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></div>
        <div><label className="label" htmlFor="d-lim">Usage limit</label><input id="d-lim" type="number" min={1} className="input" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></div>
        <div><label className="label" htmlFor="d-exp">Expires</label><input id="d-exp" type="date" className="input" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></div>
        <div className="sm:col-span-3"><button className="btn-dark">Create code</button></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase text-ink-mute"><tr>{['Code', 'Discount', 'Min. purchase', 'Used', 'Expires', 'Active'].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}<th /></tr></thead>
          <tbody>{list?.map((d) => (
            <tr key={d.id} className="border-b border-ink/5">
              <td className="p-3 font-mono font-medium">{d.code}</td><td className="p-3">{d.type === 'PERCENT' ? `${d.value}%` : ngn(d.value)}</td><td className="p-3">{d.minPurchaseMinor ? ngn(d.minPurchaseMinor) : '-'}</td>
              <td className="p-3">{d.usedCount}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</td><td className="p-3">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : 'Never'}</td>
              <td className="p-3"><input type="checkbox" className="accent-brand" aria-label={`${d.code} active`} checked={d.isActive} onChange={async (e) => { await api(`/admin/discounts/${d.id}`, { method: 'PUT', json: { code: d.code, type: d.type, value: d.value, minPurchaseMinor: d.minPurchaseMinor, usageLimit: d.usageLimit, expiresAt: d.expiresAt, isActive: e.target.checked } }).catch((er) => toast(er.message, 'err')); load(); }} /></td>
              <td className="p-3 text-end"><button className="text-red-700 underline" onClick={async () => { if (confirm(`Delete ${d.code}?`)) { await api(`/admin/discounts/${d.id}`, { method: 'DELETE' }); load(); } }}>Delete</button></td>
            </tr>))}</tbody>
        </table>
        {!list && <div className="skeleton m-4 h-24" />}
      </div>
    </div>
  );
}
