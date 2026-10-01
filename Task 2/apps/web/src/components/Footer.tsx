'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Logo } from './Header';
import { usePrefs, useToast } from './providers';

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const { t } = usePrefs();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex w-full max-w-md gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api('/newsletter', { method: 'POST', json: { email } });
          toast('Thanks for subscribing! Check your inbox.');
          setEmail('');
        } catch (err: any) {
          toast(err.message, 'err');
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`input ${dark ? '!border-white/20 !bg-white/10 !text-white placeholder:!text-white/60' : ''}`} placeholder={t('common.email')} aria-label="Newsletter email" />
      <button className="btn-brand shrink-0" disabled={busy}>{t('common.subscribe')}</button>
    </form>
  );
}

export default function Footer({ categories }: { categories: { name: string; slug: string }[] }) {
  const { t } = usePrefs();
  return (
    <footer className="mt-24 bg-ink text-white/80">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo className="text-white" />
          <p className="mt-4 max-w-xs text-sm">{t('footer.tag')}</p>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-white">{t('footer.shop')}</h3>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => <li key={c.slug}><Link href={`/shop?category=${c.slug}`} className="hover:text-white">{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-white">{t('footer.help')}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/faq" className="hover:text-white">{t('footer.faq')}</Link></li>
            <li><Link href="/policies/returns" className="hover:text-white">{t('footer.returns')}</Link></li>
            <li><Link href="/policies/shipping" className="hover:text-white">{t('footer.shippingPolicy')}</Link></li>
            <li><Link href="/policies/privacy" className="hover:text-white">{t('footer.privacy')}</Link></li>
            <li><Link href="/account" className="hover:text-white">{t('nav.account')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-white">{t('home.newsletter')}</h3>
          <NewsletterForm dark />
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">
        &copy; {new Date().getFullYear()} Modeza. {t('footer.rights')}
      </div>
    </footer>
  );
}
