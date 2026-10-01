'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, useToast } from '@/components/providers';
import { api, Order } from '@/lib/api';
import { ngn } from '@/lib/format';

interface Customer { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN'; emailVerified: boolean; createdAt: string; _count: { orders: number } }

export default function AdminCustomers() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Customer[] } | null>(null);
  const [open, setOpen] = useState<{ name: string; email: string; phone: string | null; orders: Order[] } | null>(null);
  const load = useCallback(() => api<{ total: number; items: Customer[] }>(`/admin/customers?page=${page}&q=${encodeURIComponent(q)}`).then(setData).catch((e) => toast(e.message, 'err')), [page, q, toast]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);

  const setRole = async (c: Customer, role: 'ADMIN' | 'CUSTOMER') => {
    if (!confirm(`${role === 'ADMIN' ? 'Grant admin access to' : 'Remove admin access from'} ${c.email}?`)) return;
    try { await api(`/admin/customers/${c.id}/role`, { method: 'PATCH', json: { role } }); toast('Role updated'); load(); } catch (e: any) { toast(e.message, 'err'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Customers</h1>
      <input className="input max-w-sm" placeholder="Search name or email" aria-label="Search customers" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase text-ink-mute"><tr>{['Name', 'Email', 'Joined', 'Orders', 'Role'].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}<th /></tr></thead>
          <tbody>{data?.items.map((c) => (
            <tr key={c.id} className="border-b border-ink/5">
              <td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.email} {!c.emailVerified && <span className="text-xs text-amber-700">(unverified)</span>}</td>
              <td className="p-3">{new Date(c.createdAt).toLocaleDateString()}</td><td className="p-3">{c._count.orders}</td><td className="p-3">{c.role}</td>
              <td className="space-x-3 p-3 text-end">
                <button className="text-brand underline" onClick={async () => setOpen(await api(`/admin/customers/${c.id}`))}>View</button>
                {c.id !== me?.id && <button className="underline" onClick={() => setRole(c, c.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN')}>{c.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}</button>}
              </td>
            </tr>))}</tbody>
        </table>
        {!data && <div className="skeleton m-4 h-40" />}
      </div>
      {data && data.total > 20 && <div className="flex items-center justify-center gap-3 text-sm"><button className="btn-outline !px-4 !py-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / 20)}</span><button className="btn-outline !px-4 !py-2" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(page + 1)}>Next</button></div>}
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Customer">
          <div className="card max-h-[85vh] w-full max-w-xl space-y-4 overflow-y-auto p-6">
            <div className="flex justify-between"><div><h2 className="text-2xl">{open.name}</h2><p className="text-sm text-ink-mute">{open.email} {open.phone}</p></div><button onClick={() => setOpen(null)} aria-label="Close">x</button></div>
            <h3 className="font-sans font-semibold">Orders</h3>
            {open.orders.length === 0 ? <p className="text-sm text-ink-mute">No orders.</p> : <ul className="divide-y divide-ink/10 text-sm">{open.orders.map((o) => <li key={o.id} className="flex justify-between py-2"><span>{o.orderNumber} <span className="text-ink-mute">{o.status.toLowerCase().replace('_', ' ')}</span></span><span>{ngn(o.totalMinor)}</span></li>)}</ul>}
          </div>
        </div>
      )}
    </div>
  );
}
