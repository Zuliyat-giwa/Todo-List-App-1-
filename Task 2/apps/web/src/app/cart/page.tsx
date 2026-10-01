'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { LineRow } from '@/components/CartDrawer';
import { CodeBox, Totals } from '@/components/CartParts';
import { useCart, usePrefs } from '@/components/providers';

export default function CartPage() {
  const { t } = usePrefs();
  const cart = useCart();
  if (!cart.items.length)
    return (
      <div className="container-x grid place-items-center py-28 text-center">
        <div><ShoppingBag size={48} className="mx-auto text-ink-mute" /><h1 className="mt-5 text-4xl">{t('cart.empty')}</h1><p className="mt-2 text-ink-mute">{t('cart.emptySub')}</p><Link href="/shop" className="btn-dark mt-8">{t('cart.continue')}</Link></div>
      </div>
    );
  const invalid = cart.quote ? !cart.quote.valid : true;
  return (
    <div className="container-x py-10">
      <h1 className="text-4xl sm:text-5xl">{t('cart.title')}</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="card divide-y divide-ink/10 px-5">
          {cart.quote ? cart.quote.lines.map((l) => <LineRow key={l.variantId} l={l} />) : <li className="skeleton my-4 h-32" />}
        </ul>
        <aside className="card h-fit space-y-5 p-6">
          <CodeBox />
          <Totals />
          {cart.quote && invalid && <p role="alert" className="text-sm text-red-700">{t('cart.issue')}</p>}
          <Link href="/checkout" className={`btn-dark w-full ${invalid ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={invalid}>{t('cart.checkout')}</Link>
          <Link href="/shop" className="block text-center text-sm text-ink-mute underline">{t('cart.continue')}</Link>
        </aside>
      </div>
    </div>
  );
}
