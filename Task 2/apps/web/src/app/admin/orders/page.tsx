'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/providers';
import { api, Order } from '@/lib/api';
import { ngn } from '@/lib/format';

const STATUSES = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
// Mirrors the transitions the API allows.
const NEXT: Record<string, string[]> = { PENDING_PAYMENT: ['CANCELLED'], PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'], PROCESSING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [], REFUNDED: [] };

function Detail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [o, setO] = useState<Order | null>(null);
  const [track, setTrack] = useState({ carrier: '', trackingNumber: '' });
  const load = useCallback(() => api<Order>(`/admin/orders/${id}`).then((x) => { setO(x); setTrack({ carrier: x.shipment?.carrier ?? '', trackingNumber: x.shipment?.trackingNumber ?? '' }); }), [id]);
  useEffect(() => { load().catch((e) => toast(e.message, 'err')); }, [load, toast]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); await load(); onChanged(); } catch (e: any) { toast(e.message, 'err'); } };
  if (!o) return null;
  const paid = o.payment?.status === 'SUCCESS';
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`Order ${o.orderNumber}`}>
      <div className="card mx-auto my-6 max-w-3xl space-y-6 p-6 sm:p-8">
        <div className="flex items-start justify-between"><div><h2 className="text-2xl">{o.orderNumber}</h2><p className="text-sm text-ink-mute">{new Date(o.createdAt).toLocaleString()}</p></div><button onClick={onClose} aria-label="Close"><X /></button></div>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div><p className="label">Customer</p><p>{o.customerName}<br />{o.email}<br />{o.phone}</p></div>
          <div><p className="label">Ship to</p><p>{o.address.street}, {o.address.city}<br />{o.address.state}, {o.address.country} {o.address.postalCode}<br /><span className="text-ink-mute">{o.address.notes}</span></p></div>
        </div>
        <ul className="divide-y divide-ink/10 text-sm">{o.items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.productName} <span className="text-ink-mute">{[i.size, i.color].filter(Boolean).join(' / ')} x {i.quantity}</span></span><span>{ngn(i.unitMinor * i.quantity)}</span></li>)}</ul>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{ngn(o.subtotalMinor)}</span></div>
          {o.discountMinor > 0 && <div className="flex justify-between"><span>Discount ({o.discountCode})</span><span>-{ngn(o.discountMinor)}</span></div>}
          <div className="flex justify-between"><span>Shipping ({o.shippingMethod})</span><span>{ngn(o.shippingMinor)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{ngn(o.taxMinor)}</span></div>
          <div className="flex justify-between border-t border-ink/10 pt-2 font-semibold"><span>Total</span><span>{ngn(o.totalMinor)}</span></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-cream-100 p-4 text-sm">
          <span>Status: <strong data-testid="admin-order-status">{o.status}</strong></span><span>Payment: <strong>{o.payment?.status ?? 'none'}</strong> ({o.payment?.provider ?? '-'})</span>
          {o.status === 'PENDING_PAYMENT' && <button className="btn-outline !px-4 !py-1.5" onClick={() => run(() => api(`/admin/orders/${o.id}/verify-payment`, { method: 'POST' }), 'Payment re-checked')}>Verify payment</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {NEXT[o.status].map((s) => <button key={s} className={s === 'CANCELLED' ? 'btn-outline !px-4 !py-2 text-red-700' : 'btn-dark !px-4 !py-2'} onClick={() => run(() => api(`/admin/orders/${o.id}/status`, { method: 'PATCH', json: { status: s } }), `Order ${s.toLowerCase()}`)}>{s === 'CANCELLED' ? 'Cancel order' : `Mark ${s.toLowerCase()}`}</button>)}
          {paid && ['PAID', 'PROCESSING', 'CANCELLED', 'SHIPPED', 'DELIVERED'].includes(o.status) && <button className="btn-outline !px-4 !py-2" onClick={() => confirm('Refund this payment to the customer?') && run(() => api(`/admin/orders/${o.id}/refund`, { method: 'POST' }), 'Refund issued')}>Refund</button>}
        </div>
        {['PAID', 'PROCESSING', 'SHIPPED'].includes(o.status) && (
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); run(() => api(`/admin/orders/${o.id}/shipment`, { method: 'PATCH', json: { carrier: track.carrier || undefined, trackingNumber: track.trackingNumber } }), 'Tracking saved'); }}>
            <input className="input" placeholder="Carrier" aria-label="Carrier" value={track.carrier} onChange={(e) => setTrack({ ...track, carrier: e.target.value })} />
            <input className="input" required minLength={3} placeholder="Tracking number" aria-label="Tracking number" value={track.trackingNumber} onChange={(e) => setTrack({ ...track, trackingNumber: e.target.value })} />
            <button className="btn-dark">{o.status === 'SHIPPED' ? 'Update tracking' : 'Ship with tracking'}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Order[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => api<{ total: number; items: Order[] }>(`/admin/orders?page=${page}&q=${encodeURIComponent(q)}&status=${status}`).then(setData).catch((e) => toast(e.message, 'err')), [page, q, status, toast]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);
  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Orders</h1>
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search order, email, name" aria-label="Search orders" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input !w-auto" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase text-ink-mute"><tr>{['Order', 'Customer', 'Date', 'Total', 'Status', 'Payment'].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}<th /></tr></thead>
          <tbody>{data?.items.map((o) => (
            <tr key={o.id} className="border-b border-ink/5">
              <td className="p-3 font-medium">{o.orderNumber}</td><td className="p-3">{o.customerName}<span className="block text-xs text-ink-mute">{o.email}</span></td>
              <td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td><td className="p-3">{ngn(o.totalMinor)}</td><td className="p-3">{o.status.replace('_', ' ')}</td><td className="p-3">{o.payment?.status ?? '-'}</td>
              <td className="p-3 text-end"><button className="text-brand underline" onClick={() => setOpen(o.id)}>Manage</button></td>
            </tr>))}</tbody>
        </table>
        {data && data.items.length === 0 && <p className="p-8 text-center text-ink-mute">No orders match.</p>}
        {!data && <div className="skeleton m-4 h-40" />}
      </div>
      {data && data.total > 20 && <div className="flex items-center justify-center gap-3 text-sm"><button className="btn-outline !px-4 !py-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / 20)}</span><button className="btn-outline !px-4 !py-2" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(page + 1)}>Next</button></div>}
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
