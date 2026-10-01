'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/providers';

const LINKS = [
  ['/admin', 'Overview'],
  ['/admin/products', 'Products'],
  ['/admin/orders', 'Orders'],
  ['/admin/customers', 'Customers'],
  ['/admin/discounts', 'Discounts'],
  ['/admin/content', 'Content'],
  ['/admin/settings', 'Settings'],
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace('/login?next=/admin');
  }, [ready, user, router]);

  if (!ready) return <div className="container-x py-20"><div className="skeleton h-48" /></div>;
  if (user && user.role !== 'ADMIN')
    return (
      <div className="container-x py-28 text-center" data-testid="admin-forbidden">
        <h1 className="text-4xl">Access denied</h1>
        <p className="mt-2 text-ink-mute">This area is for store administrators only.</p>
        <Link href="/" className="btn-dark mt-8">Back to store</Link>
      </div>
    );
  if (!user) return null;

  return (
    <div className="container-x py-8">
      <div className="grid gap-8 lg:grid-cols-[210px_1fr]">
        <nav aria-label="Admin" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {LINKS.map(([href, label]) => {
            const on = href === '/admin' ? path === href : path.startsWith(href);
            return <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium ${on ? 'bg-ink text-white' : 'hover:bg-ink/5'}`}>{label}</Link>;
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
