'use client';

import { useState } from 'react';
import { useCart, usePrefs } from './providers';

export function CodeBox() {
  const { t } = usePrefs();
  const cart = useCart();
  const [v, setV] = useState(cart.code);
  return (
    <div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); cart.applyCode(v); }}>
        <input className="input" value={v} onChange={(e) => setV(e.target.value)} placeholder={t('cart.codePlaceholder')} aria-label={t('cart.code')} />
        <button className="btn-outline shrink-0">{t('common.apply')}</button>
      </form>
      {cart.quote?.discountError && <p role="alert" className="mt-2 text-sm text-red-700">{cart.quote.discountError}</p>}
      {cart.quote?.discountCode && <p className="mt-2 text-sm text-emerald-700">Code {cart.quote.discountCode} applied</p>}
    </div>
  );
}

export function Totals({ shippingLabel }: { shippingLabel?: string }) {
  const { t, money } = usePrefs();
  const { quote } = useCart();
  if (!quote) return <div className="skeleton h-32" />;
  const row = (l: string, v: string, strong = false, cls = '') => <div className={`flex justify-between ${strong ? 'text-lg font-semibold' : 'text-sm'} ${cls}`}><span>{l}</span><span>{v}</span></div>;
  return (
    <div className="space-y-2" data-testid="totals">
      {row(t('common.subtotal'), money(quote.subtotalMinor))}
      {quote.discountMinor > 0 && row(t('common.discount'), '-' + money(quote.discountMinor), false, 'text-brand')}
      {row(t('common.shipping'), shippingLabel ?? (quote.shippingMethodId ? (quote.shippingMinor ? money(quote.shippingMinor) : t('common.free')) : 'Calculated at checkout'))}
      {quote.taxMinor > 0 && row(`${t('common.tax')} (${quote.taxPercent}%)`, money(quote.taxMinor))}
      <div className="border-t border-ink/10 pt-3">{row(t('common.total'), money(quote.totalMinor), true)}</div>
    </div>
  );
}

