import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductView from '@/components/ProductView';
import { ApiError, Product, serverApi } from '@/lib/api';

export const revalidate = 30;

async function load(slug: string) {
  try {
    return await serverApi<Product>(`/products/${encodeURIComponent(slug)}`, 30);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug).catch(() => null);
  return p ? { title: p.name, description: p.description.slice(0, 160), openGraph: { images: p.images[0]?.url ? [p.images[0].url] : [] } } : { title: 'Product not found' };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return <ProductView p={p} />;
}
