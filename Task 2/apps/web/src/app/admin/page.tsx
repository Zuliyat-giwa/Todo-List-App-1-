'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ngn } from '@/lib/format';

interface Stats {
  totalSalesMinor: number; totalOrders: number; totalCustomers: number; totalProducts: number; pendingOrders: number; completedOrders: number;
  lowStock: { variantId: string; product: string; sku: string; size: string | null; color: string | null; stock: number }[];
  recentTransactions: { reference: string; amountMinor: number; status: string; orderNumber: string; customer: string; at: string }[];
  salesByDay: { date: string; totalMinor: number }[];
}

function SalesChart({ data }: { data: Stats['salesByDay'] }) {
  const max = Math.max(1, ...data.map((d) => d.totalMinor));
  const w = 720, h = 200, bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 28}`} className="w-full" role="img" aria-label="Sales over the last 30 days">
      {[0, 0.5, 1].map((f) => <line key={f} x1="0" x2={w} y1={h - f * h} y2={h - f * h} stroke="#1f1a17" strokeOpacity=".08" />)}
      {data.map((d, i) => {
        const bh = (d.totalMinor / max) * (h - 8);
        return (
          <g key={d.date}>
            <rect x={i * bw + 3} y={h - bh} width={bw - 6} height={Math.max(bh, d.totalMinor ? 2 : 0)} rx="3" fill="#c4551d"><title>{`${d.date}: ${ngn(d.totalMinor)}`}</title></rect>
            {i % 5 === 0 && <text x={i * bw + bw / 2} y={h + 18} textAnchor="middle" fontSize="11" fill="#6f645c">{d.date.slice(5)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<Stats>('/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <p role="alert" className="text-red-700">{err}</p>;
  if (!s) return <div className="skeleton h-64" />;
  const cards: [string, string][] = [
    ['Total sales', ngn(s.totalSalesMinor)], ['Orders', String(s.totalOrders)], ['Customers', String(s.totalCustomers)], ['Products', String(s.totalProducts)],
    ['Pending orders', String(s.pendingOrders)], ['Completed orders', String(s.completedOrders)],
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" data-testid="admin-stats">
        {cards.map(([k, v]) => <div key={k} className="card p-5"><p className="label">{k}</p><p className="font-serif text-3xl">{v}</p></div>)}
      </div>
      <section className="card p-6"><h2 className="mb-4 text-xl">Sales, last 30 days</h2><SalesChart data={s.salesByDay} /></section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-xl">Low stock</h2>
          {s.lowStock.length === 0 ? <p className="text-sm text-ink-mute">Everything is well stocked.</p> : (
            <ul className="divide-y divide-ink/10 text-sm">{s.lowStock.map((v) => (
              <li key={v.variantId} className="flex justify-between gap-3 py-2"><span>{v.product} <span className="text-ink-mute">({[v.size, v.color].filter(Boolean).join(' / ') || v.sku})</span></span><span className={v.stock === 0 ? 'font-semibold text-red-700' : 'font-semibold text-amber-700'}>{v.stock} left</span></li>
            ))}</ul>
          )}
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-xl">Recent transactions</h2>
          {s.recentTransactions.length === 0 ? <p className="text-sm text-ink-mute">No transactions yet.</p> : (
            <ul className="divide-y divide-ink/10 text-sm">{s.recentTransactions.map((t) => (
              <li key={t.reference} className="flex justify-between gap-3 py-2"><span>{t.orderNumber} <span className="text-ink-mute">{t.customer}</span></span><span>{ngn(t.amountMinor)} <span className="text-xs text-ink-mute">{t.status.toLowerCase()}</span></span></li>
            ))}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
