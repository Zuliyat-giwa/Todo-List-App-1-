'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { usePrefs, useWishlist } from '@/components/providers';
import { api, Product } from '@/lib/api';

export default function WishlistPage() {
  const { t } = usePrefs();
  const wish = useWishlist();
  const [items, setItems] = useState<Product[] | null>(null);
  const key = wish.ids.join(',');
  useEffect(() => {
    if (!key) { setItems([]); return; }
    api<Product[]>(`/products/by-ids?ids=${key}`).then(setItems).catch(() => setItems([]));
  }, [key]);
  return (
    <div className="container-x py-10">
      <h1 className="text-4xl sm:text-5xl">{t('nav.wishlist')}</h1>
      {items === null ? (
        <div className="skeleton mt-8 h-64" />
      ) : items.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="font-serif text-2xl">Nothing saved yet</p>
          <p className="mt-2 text-ink-mute">Tap the heart on any product to save it here.</p>
          <Link href="/shop" className="btn-dark mt-6">{t('cart.continue')}</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </div>
  );
}
