'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { api, Quote, ShippingMethod } from '@/lib/api';
import { useAuth, useCart, usePrefs, useToast } from '@/components/providers';
import { CodeBox } from '@/components/CartParts';

const STEPS = ['checkout.customer', 'checkout.address', 'checkout.method', 'checkout.review', 'checkout.payment'];
const field = (v: string) => v.trim();

/** One idempotency key per distinct cart, kept across refreshes so a double-click or reload never creates two orders. */
function idempotencyKey(signature: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem('modeza.idem') ?? 'null');
    if (saved?.sig === signature) return saved.key as string;
    const key = crypto.randomUUID();
    sessionStorage.setItem('modeza.idem', JSON.stringify({ sig: signature, key }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export default function CheckoutPage() {
  const { t, money, countries, country: prefCountry, locale } = usePrefs();
  const { user } = useAuth();
  const cart = useCart();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [methodId, setMethodId] = useState('');
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [c, setC] = useState({ name: '', email: '', phone: '' });
  const [a, setA] = useState({ country: 'NG', state: '', city: '', street: '', postalCode: '', notes: '' });

  useEffect(() => { api<ShippingMethod[]>('/cart/shipping-methods').then((m) => { setMethods(m); setMethodId((cur) => cur || m[0]?.id || ''); }).catch(() => {}); }, []);
  useEffect(() => { if (prefCountry && countries.some((x) => x.code === prefCountry)) setA((cur) => (cur.state || cur.city ? cur : { ...cur, country: prefCountry })); }, [prefCountry, countries]);
  useEffect(() => {
    if (!user) return;
    setC((cur) => ({ name: cur.name || user.name, email: cur.email || user.email, phone: cur.phone || user.phone || '' }));
    api<any[]>('/account/addresses').then((list) => {
      const d = list.find((x) => x.isDefault) ?? list[0];
      if (d) setA((cur) => (cur.street ? cur : { country: d.country, state: d.state, city: d.city, street: d.street, postalCode: d.postalCode ?? '', notes: '' }));
    }).catch(() => {});
  }, [user]);

  // authoritative totals for the chosen shipping method and destination
  useEffect(() => {
    if (!cart.items.length || !methodId) return;
    let off = false;
    api<Quote>('/cart/quote', { method: 'POST', json: { items: cart.items, code: cart.code || undefined, shippingMethodId: methodId, country: a.country } })
      .then((q) => !off && setQuote(q)).catch(() => {});
    return () => { off = true; };
  }, [cart.items, cart.code, methodId, a.country]);

  const method = methods.find((m) => m.id === methodId);
  const eta = useMemo(() => {
    if (!method) return '';
    const f = (d: number) => new Date(Date.now() + d * 86_400_000).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'short' });
    return `${f(method.minDays)} - ${f(method.maxDays)}`;
  }, [method, locale]);

  if (!cart.items.length)
    return <div className="container-x py-28 text-center"><h1 className="text-4xl">{t('cart.empty')}</h1><Link href="/shop" className="btn-dark mt-8">{t('cart.continue')}</Link></div>;

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (field(c.name).length < 2) e.name = 'Enter your full name';
      if (!/^\S+@\S+\.\S+$/.test(c.email)) e.email = 'Enter a valid email address';
      if (!/^[+\d][\d\s()-]{6,}$/.test(c.phone)) e.phone = 'Enter a valid phone number';
    }
    if (s === 1) {
      if (!a.country) e.country = 'Select a country';
      if (field(a.state).length < 2) e.state = 'Enter your state or region';
      if (field(a.city).length < 2) e.city = 'Enter your city';
      if (field(a.street).length < 3) e.street = 'Enter your street address';
    }
    if (s === 2 && !methodId) e.method = 'Choose a delivery method';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => validate(step) && setStep(step + 1);

  const pay = async () => {
    if (!validate(0) || !validate(1) || !validate(2)) { setStep(0); return; }
    setBusy(true);
    try {
      const sig = JSON.stringify([cart.items, cart.code, methodId, a.country]);
      const order = await api<{ orderNumber: string; email: string }>('/checkout/orders', {
        method: 'POST',
        json: {
          customer: { name: field(c.name), email: c.email.trim(), phone: c.phone.trim() },
          address: { country: a.country, state: field(a.state), city: field(a.city), street: field(a.street), postalCode: a.postalCode || undefined, notes: a.notes || undefined },
          shippingMethodId: methodId, items: cart.items, discountCode: cart.code || undefined, idempotencyKey: idempotencyKey(sig),
        },
      });
      const init = await api<{ authorizationUrl: string }>(`/payments/${order.orderNumber}/initialize`, { method: 'POST', json: { email: order.email } });
      window.location.href = init.authorizationUrl;
    } catch (err: any) {
      toast(err.message, 'err');
      cart.refreshQuote();
      setBusy(false);
      if (/stock|sold out|available|cart/i.test(err.message)) window.location.assign('/cart');
    }
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-1 text-xs text-red-700">{errors[k]}</p>;
  const lines = (quote ?? cart.quote)?.lines ?? [];
  const q = quote ?? cart.quote;

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl sm:text-5xl">{t('checkout.title')}</h1>
      <ol className="mt-8 flex flex-wrap gap-2 text-sm" aria-label="Checkout steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={`flex items-center gap-2 rounded-full px-4 py-2 ${i === step ? 'bg-ink text-white' : i < step ? 'bg-cream-200' : 'bg-white text-ink-mute'}`}>
            {i < step ? <Check size={14} /> : <span>{i + 1}</span>} {t(s)}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <section className="card p-6 sm:p-8" aria-live="polite">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{t('checkout.customer')}</h2>
              {!user && <p className="text-sm text-ink-mute">Have an account? <Link href="/login?next=/checkout" className="text-brand underline">{t('auth.login')}</Link></p>}
              <div><label className="label" htmlFor="c-name">{t('checkout.name')}</label><input id="c-name" className="input" autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />{err('name')}</div>
              <div><label className="label" htmlFor="c-email">{t('common.email')}</label><input id="c-email" type="email" className="input" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />{err('email')}</div>
              <div><label className="label" htmlFor="c-phone">{t('checkout.phone')}</label><input id="c-phone" type="tel" className="input" autoComplete="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />{err('phone')}</div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{t('checkout.address')}</h2>
              <div><label className="label" htmlFor="a-country">{t('checkout.country')}</label>
                <select id="a-country" className="input" value={a.country} onChange={(e) => setA({ ...a, country: e.target.value })}>
                  {(countries.length ? countries : [{ code: 'NG', name: 'Nigeria' }]).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                </select>{err('country')}</div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className="label" htmlFor="a-state">{t('checkout.state')}</label><input id="a-state" className="input" autoComplete="address-level1" value={a.state} onChange={(e) => setA({ ...a, state: e.target.value })} />{err('state')}</div>
                <div><label className="label" htmlFor="a-city">{t('checkout.city')}</label><input id="a-city" className="input" autoComplete="address-level2" value={a.city} onChange={(e) => setA({ ...a, city: e.target.value })} />{err('city')}</div>
              </div>
              <div><label className="label" htmlFor="a-street">{t('checkout.street')}</label><input id="a-street" className="input" autoComplete="street-address" value={a.street} onChange={(e) => setA({ ...a, street: e.target.value })} />{err('street')}</div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className="label" htmlFor="a-postal">{t('checkout.postal')}</label><input id="a-postal" className="input" autoComplete="postal-code" value={a.postalCode} onChange={(e) => setA({ ...a, postalCode: e.target.value })} /></div>
              </div>
              <div><label className="label" htmlFor="a-notes">{t('checkout.notes')}</label><textarea id="a-notes" className="input min-h-20" value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })} /></div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl">{t('checkout.method')}</h2>
              {methods.map((m) => {
                const free = m.freeOverMinor != null && (cart.quote?.subtotalMinor ?? 0) - (cart.quote?.discountMinor ?? 0) >= m.freeOverMinor;
                return (
                  <label key={m.id} className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 ${methodId === m.id ? 'border-ink bg-cream-100' : 'border-ink/15'}`}>
                    <span className="flex items-center gap-3"><input type="radio" name="method" checked={methodId === m.id} onChange={() => setMethodId(m.id)} className="accent-brand" />
                      <span><span className="block font-medium">{m.name}</span><span className="text-sm text-ink-mute">{m.minDays}-{m.maxDays} business days</span></span></span>
                    <span className="font-semibold">{free ? t('common.free') : money(m.priceMinor)}</span>
                  </label>
                );
              })}
              {eta && <p className="text-sm text-ink-mute">{t('checkout.est')}: <strong>{eta}</strong></p>}
              {err('method')}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl">{t('checkout.review')}</h2>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="label">{t('checkout.customer')}</p><p>{c.name}<br />{c.email}<br />{c.phone}</p><button className="mt-1 text-brand underline" onClick={() => setStep(0)}>Edit</button></div>
                <div><p className="label">{t('checkout.address')}</p><p>{a.street}<br />{a.city}, {a.state}<br />{countries.find((x) => x.code === a.country)?.name ?? a.country} {a.postalCode}</p><button className="mt-1 text-brand underline" onClick={() => setStep(1)}>Edit</button></div>
              </div>
              <p className="text-sm"><span className="label inline">{t('checkout.method')}: </span>{method?.name} ({eta})</p>
              <CodeBox />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{t('checkout.payment')}</h2>
              <p className="text-sm text-ink-soft">You will be redirected to our secure payment provider to complete your payment. We never see or store your card details.</p>
              {q && <p className="text-lg font-semibold">{t('common.total')}: NGN {(q.totalMinor / 100).toLocaleString('en-NG')}</p>}
              <p className="rounded-xl bg-cream-100 p-3 text-xs text-ink-soft">{t('checkout.currencyNote')}</p>
              <button className="btn-brand w-full" onClick={pay} disabled={busy || !q?.valid} data-testid="pay-now">{busy ? t('checkout.processing') : t('checkout.pay')}</button>
              {q && !q.valid && <p role="alert" className="text-sm text-red-700">{t('cart.issue')} <Link href="/cart" className="underline">{t('cart.title')}</Link></p>}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button className="btn-outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy}>{t('common.back')}</button>
            {step < 4 && <button className="btn-dark" onClick={next} data-testid="step-next">{t('common.continue')}</button>}
          </div>
        </section>

        <aside className="card h-fit space-y-5 p-6">
          <ul className="divide-y divide-ink/10">
            {lines.map((l) => (
              <li key={l.variantId} className="flex gap-3 py-3">
                <img src={l.imageUrl ?? ''} alt="" className="h-20 w-16 rounded-lg object-cover" />
                <div className="flex-1 text-sm"><p className="font-medium">{l.name}</p><p className="text-xs text-ink-mute">{[l.size, l.color].filter(Boolean).join(' / ')} x {l.quantity}</p>{l.issue && <p className="text-xs text-red-700">{l.issue.replace('_', ' ').toLowerCase()}</p>}</div>
                <span className="text-sm font-medium">{money(l.lineMinor)}</span>
              </li>
            ))}
          </ul>
          {q && (
            <div className="space-y-2 text-sm" data-testid="checkout-totals">
              <div className="flex justify-between"><span>{t('common.subtotal')}</span><span>{money(q.subtotalMinor)}</span></div>
              {q.discountMinor > 0 && <div className="flex justify-between text-brand"><span>{t('common.discount')} ({q.discountCode})</span><span>-{money(q.discountMinor)}</span></div>}
              <div className="flex justify-between"><span>{t('common.shipping')}</span><span>{q.shippingMethodId ? (q.shippingMinor ? money(q.shippingMinor) : t('common.free')) : '-'}</span></div>
              {q.taxMinor > 0 && <div className="flex justify-between"><span>{t('common.tax')} ({q.taxPercent}%)</span><span>{money(q.taxMinor)}</span></div>}
              <div className="flex justify-between border-t border-ink/10 pt-3 text-lg font-semibold"><span>{t('common.total')}</span><span>{money(q.totalMinor)}</span></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
