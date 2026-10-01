import { serverApi } from '@/lib/api';

export const metadata = { title: 'FAQ' };
export const revalidate = 300;

export default async function Faq() {
  const faqs = await serverApi<{ id: string; question: string; answer: string }[]>('/content/faqs', 300).catch(() => []);
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-4xl sm:text-5xl">Frequently asked questions</h1>
      <div className="mt-8 space-y-3">
        {faqs.map((f) => (
          <details key={f.id} className="card p-5">
            <summary className="cursor-pointer font-medium">{f.question}</summary>
            <p className="mt-3 text-ink-soft">{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
