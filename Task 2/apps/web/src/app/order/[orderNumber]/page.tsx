'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react';
import { api, Order } from '@/lib/api';
import { useCart, usePrefs, useToast } from '@/components/providers';

const FLOW = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function OrderView() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const sp = useSearchParams();
  const email = sp.get('email') ?? '';
  const reference = sp.get('reference');
  const { t, money } = usePrefs();
  const cart = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(!!reference);

  const load = () => api<Order>(`/orders/${orderNumber}${email ? `?email=${encodeURIComponent(email)}` : ''}`).then(setOrder).catch((e) => setError(e.message));

  useEffect(() => {
    let off = false;
    (async () => {
      if (reference) {
        // Confirm with the backend (which asks the payment provider). Retry briefly if the provider is still settling.
        for (let i = 0; i < 6 && !off; i++) {
          try {
            const r = await api<{ status: string }>(`/payments/verify?reference=${encodeURIComponent(reference)}`);
            if (r.status === 'SUCCESS') { cart.clear(); try { sessionStorage.removeItem('modeza.idem'); } catch {} break; }
            if (r.status === 'FAILED') { toast('Payment was not completed', 'err'); break; }
          } catch { /* retry */ }
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (!off) setVerifying(false);
      }
      if (!off) load();
    })();
    return () => { off = true; };
  }, [orderNumber, reference]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="container-x py-28 text-center"><h1 className="text-4xl">Order not found</h1><p className="mt-2 text-ink-mute">{error}</p><Link href="/" className="btn-dark mt-8">Home</Link></div>;
  if (!order || verifying) return <div className="container-x py-28 text-center"><Clock className="mx-auto text-ink-mute" /><p className="mt-4 font-serif text-2xl">{t('order.verifying')}</p></div>;

  const paid = FLOW.includes(order.status);
  const idx = FLOW.indexOf(order.status);
  const pay = async () => {
    try { const r = await api<{ authorizationUrl: string }>(`/payments/${order.orderNumber}/initialize`, { method: 'POST', json: { email: order.email } }); window.location.href = r.authorizationUrl; }
    catch (e: any) { toast(e.message, 'err'); }
  };
  const cancel = async () => { try { await api(`/orders/${order.orderNumber}/cancel?email=${encodeURIComponent(order.email)}`, { method: 'POST' }); load(); } catch (e: any) { toast(e.message, 'err'); } };

  return (
    <div className="container-x max-w-4xl py-12">
      <div className="text-center">
        {paid ? <CheckCircle2 size={52} className="mx-auto text-emerald-600" /> : order.status === 'PENDING_PAYMENT' ? <Clock size={52} className="mx-auto text-amber-600" /> : <XCircle size={52} className="mx-auto text-red-600" />}
        <h1 className="mt-4 text-4xl sm:text-5xl">{paid ? t('order.thanks') : order.status === 'PENDING_PAYMENT' ? t('order.pending') : `Order ${order.status.toLowerCase().replace('_', ' ')}`}</h1>
        {paid && <p className="mt-3 text-ink-soft">{t('order.confirmEmail', { email: order.email })}</p>}
        <p className="mt-2 text-sm text-ink-mute">{t('order.number')}: <strong data-testid="order-number" className="text-ink">{order.orderNumber}</strong></p>
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm">Your items are reserved for 30 minutes while payment is pending.</p>
          <div className="flex gap-3"><button className="btn-outline" onClick={cancel}>Cancel order</button><button className="btn-brand" onClick={pay}>{t('checkout.pay')}</button></div>
        </div>
      )}

      {paid && (
        <ol className="card mt-8 grid grid-cols-4 gap-2 p-6 text-center text-xs sm:text-sm" aria-label={t('order.tracking')}>
          {FLOW.map((s, i) => (
            <li key={s} className={i <= idx ? 'font-semibold text-ink' : 'text-ink-mute'}>
              <span className={`mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full ${i <= idx ? 'bg-ink text-white' : 'bg-cream-200'}`}>{i === 3 ? <Package size={17} /> : i === 2 ? <Truck size={17} /> : i + 1}</span>
              {s[0] + s.slice(1).toLowerCase()}
            </li>
          ))}
        </ol>
      )}
      {order.shipment?.trackingNumber && (
        <p className="card mt-4 p-4 text-sm"><strong>{t('order.tracking')}:</strong> {order.shipment.carrier ?? 'Courier'} - <span className="font-mono">{order.shipment.trackingNumber}</span></p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <ul className="card divide-y divide-ink/10 px-5">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 py-4">
              <img src={i.imageUrl ?? ''} alt="" className="h-24 w-20 rounded-lg object-cover" />
              <div className="flex-1 text-sm"><p className="font-medium">{i.productName}</p><p className="text-xs text-ink-mute">{[i.size, i.color].filter(Boolean).join(' / ')} x {i.quantity}</p></div>
              <span className="text-sm font-semibold">{money(i.unitMinor * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <aside className="card h-fit space-y-2 p-5 text-sm">
          <div className="flex justify-between"><span>{t('common.subtotal')}</span><span>{money(order.subtotalMinor)}</span></div>
          {order.discountMinor > 0 && <div className="flex justify-between text-brand"><span>{t('common.discount')}</span><span>-{money(order.discountMinor)}</span></div>}
          <div className="flex justify-between"><span>{t('common.shipping')}</span><span>{order.shippingMinor ? money(order.shippingMinor) : t('common.free')}</span></div>
          {order.taxMinor > 0 && <div className="flex justify-between"><span>{t('common.tax')}</span><span>{money(order.taxMinor)}</span></div>}
          <div className="flex justify-between border-t border-ink/10 pt-3 text-lg font-semibold"><span>{t('common.total')}</span><span>{money(order.totalMinor)}</span></div>
          <div className="space-y-1 border-t border-ink/10 pt-3 text-ink-soft">
            <p><span className="text-ink-mute">{t('order.payment')}:</span> <span data-testid="payment-status">{order.payment?.status ?? 'Not started'}</span></p>
            <p><span className="text-ink-mute">{t('order.status')}:</span> <span data-testid="order-status">{order.status.replace('_', ' ')}</span></p>
            <p className="pt-2">{order.address.street}, {order.address.city}, {order.address.state}</p>
          </div>
        </aside>
      </div>
      <div className="mt-10 text-center"><Link href="/shop" className="btn-dark">{t('cart.continue')}</Link></div>
    </div>
  );
}

export default function OrderPage() {
  return <Suspense fallback={null}><OrderView /></Suspense>;
}
