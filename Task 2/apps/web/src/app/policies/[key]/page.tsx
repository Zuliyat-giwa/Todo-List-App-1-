import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api';

export const revalidate = 300;

export default async function Policy({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const all: Record<string, { title: string; body: string }> = await serverApi('/content/policies', 300).catch(() => ({}));
  const p = all[key];
  if (!p) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-4xl sm:text-5xl">{p.title}</h1>
      <div className="mt-6 whitespace-pre-line leading-relaxed text-ink-soft">{p.body}</div>
    </div>
  );
}
