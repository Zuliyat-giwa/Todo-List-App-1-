'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useEffect } from 'react';
import { useCart, usePrefs } from './providers';

export function LineRow({ l, compact = false }: { l: import('@/lib/api').QuoteLine; compact?: boolean }) {
  const { money, t } = usePrefs();
  const cart = useCart();
  return (
    <li className="flex gap-4 py-4" data-testid="cart-line">
      <Link href={`/product/${l.slug}`}><img src={l.imageUrl ?? ''} alt="" className={`rounded-lg bg-cream-100 object-cover ${compact ? 'h-24 w-20' : 'h-32 w-28'}`} /></Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <Link href={`/product/${l.slug}`} className="text-sm font-medium hover:text-brand">{l.name}</Link>
          <button onClick={() => cart.remove(l.variantId)} aria-label={`${t('common.remove')} ${l.name}`} className="text-ink-mute hover:text-ink"><X size={16} /></button>
        </div>
        <p className="text-xs text-ink-mute">{[l.size, l.color].filter(Boolean).join(' / ')}</p>
        {l.issue && (
          <p role="alert" className="mt-1 text-xs font-medium text-red-700">
            {l.issue === 'LIMITED_STOCK' ? `Only ${l.stock} available` : l.issue === 'OUT_OF_STOCK' ? t('common.outOfStock') : 'No longer available'}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="inline-flex items-center rounded-full border border-ink/20">
            <button onClick={() => cart.setQty(l.variantId, l.quantity - 1)} aria-label="Decrease quantity" className="p-2"><Minus size={14} /></button>
            <span className="w-7 text-center text-sm" aria-live="polite">{l.quantity}</span>
            <button onClick={() => cart.setQty(l.variantId, l.quantity + 1)} aria-label="Increase quantity" className="p-2"><Plus size={14} /></button>
          </div>
          <span className="text-sm font-semibold">{money(l.lineMinor)}</span>
        </div>
      </div>
    </li>
  );
}

export default function CartDrawer() {
  const { open, setOpen, quote, items } = useCart();
  const { t, money } = usePrefs();
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/10 p-5">
          <h2 className="text-2xl">{t('cart.title')}</h2>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="rounded-full p-2 hover:bg-ink/5"><X size={20} /></button>
        </div>
        {!items.length ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <ShoppingBag size={40} className="mx-auto text-ink-mute" />
              <p className="mt-4 font-serif text-xl">{t('cart.empty')}</p>
              <p className="text-sm text-ink-mute">{t('cart.emptySub')}</p>
              <Link href="/shop" onClick={() => setOpen(false)} className="btn-dark mt-6">{t('cart.continue')}</Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-5">
              {quote ? quote.lines.map((l) => <LineRow key={l.variantId} l={l} compact />) : <li className="skeleton my-4 h-28" />}
            </ul>
            <div className="space-y-3 border-t border-ink/10 p-5">
              <div className="flex justify-between text-sm"><span>{t('common.subtotal')}</span><span className="font-semibold">{quote ? money(quote.subtotalMinor) : '...'}</span></div>
              {quote?.discountMinor ? <div className="flex justify-between text-sm text-brand"><span>{t('common.discount')}</span><span>-{money(quote.discountMinor)}</span></div> : null}
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn-dark w-full" aria-disabled={quote ? !quote.valid : true}>{t('cart.checkout')}</Link>
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-outline w-full">{t('cart.title')}</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
