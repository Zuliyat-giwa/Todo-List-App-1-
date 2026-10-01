'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, Heart, Menu, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { api, Category, Product } from '@/lib/api';
import { useAuth, useCart, usePrefs, useWishlist } from './providers';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`font-serif text-3xl font-bold tracking-tight ${className}`} aria-label="Modeza home">
      Modeza<span className="text-brand">.</span>
    </Link>
  );
}

export const catName = (c: { name: string; nameAr: string | null }, locale: string) => (locale === 'ar' && c.nameAr ? c.nameAr : c.name);

interface NavItem { key: string; slug?: string; href: string; cats?: string[] }
const NAV: NavItem[] = [
  { key: 'nav.new', href: '/new-arrivals' },
  { key: 'nav.women', slug: 'women', href: '/shop?category=women' },
  { key: 'nav.men', slug: 'men', href: '/shop?category=men' },
  { key: 'nav.kids', slug: 'kids', href: '/shop?category=kids' },
  { key: 'nav.accessories', slug: 'accessories', href: '/shop?category=accessories', cats: ['accessories', 'gold-and-jewelry'] },
  { key: 'nav.perfumes', slug: 'perfumes', href: '/shop?category=perfumes' },
  { key: 'nav.books', slug: 'islamic-books', href: '/shop?category=islamic-books' },
  { key: 'nav.arabian', slug: 'arabian-products', href: '/shop?category=arabian-products' },
  { key: 'nav.medicine', slug: 'prophetic-medicine', href: '/shop?category=prophetic-medicine' },
  { key: 'nav.sale', href: '/sale' },
];

function LocaleMenu() {
  const { t, locale, currency, country, countries, currencies, setCountry, setLocale, setCurrency } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium hover:bg-ink/5" aria-expanded={open} aria-haspopup="dialog" aria-label={t('locale.title')}>
        <Globe size={17} aria-hidden /> <span>{country} / {locale.toUpperCase()} / {currency}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={t('locale.title')} className="card absolute end-0 top-full z-50 mt-2 w-72 space-y-3 p-4 text-sm">
          <div>
            <label className="label" htmlFor="loc-country">{t('locale.country')}</label>
            <select id="loc-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              {!countries.length && <option value="NG">Nigeria</option>}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="loc-lang">{t('locale.language')}</label>
            <select id="loc-lang" className="input" value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'ar')}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="loc-cur">{t('locale.currency')}</label>
            <select id="loc-cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <p className="text-xs text-ink-mute">{t('locale.note')}</p>
        </div>
      )}
    </div>
  );
}

function SearchBox({ onDone }: { onDone?: () => void }) {
  const { t, money, locale } = usePrefs();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sug, setSug] = useState<{ products: Product[]; categories: { name: string; slug: string }[] } | null>(null);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setSug(null); return; }
    const id = setTimeout(() => api(`/products/suggest?q=${encodeURIComponent(q)}`).then(setSug).catch(() => setSug(null)), 250);
    return () => clearTimeout(id);
  }, [q]);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setFocus(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
    onDone?.();
  };
  return (
    <form onSubmit={go} role="search" className="relative w-full">
      <Search size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-mute" aria-hidden />
      <input
        value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
        className="input !rounded-full !bg-white/80 !ps-11 !py-2.5" placeholder={t('search.placeholder')} aria-label={t('nav.search')} type="search" autoComplete="off"
      />
      {focus && sug && (sug.products.length > 0 || sug.categories.length > 0) && (
        <div className="card absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-auto p-2">
          {sug.categories.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} onClick={onDone} className="block rounded-lg px-3 py-2 text-sm text-brand hover:bg-cream-100">{c.name} &rarr;</Link>
          ))}
          {sug.products.map((p) => (
            <Link key={p.id} href={`/product/${p.slug}`} onClick={onDone} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cream-100">
              <img src={p.images[0]?.url} alt="" className="h-12 w-10 rounded-md object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm">{locale === 'ar' && p.nameAr ? p.nameAr : p.name}</span>
              <span className="text-sm font-medium">{money(p.currentPriceMinor)}</span>
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}

export default function Header({ categories, announcement }: { categories: Category[]; announcement?: string }) {
  const { t, locale } = usePrefs();
  const { user } = useAuth();
  const cart = useCart();
  const wish = useWishlist();
  const [menu, setMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [mExpand, setMExpand] = useState<string | null>(null);
  const bySlug = (s: string) => categories.find((c) => c.slug === s);

  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobile]);

  const megaFor = (n: NavItem) => (n.cats ?? (n.slug ? [n.slug] : [])).map(bySlug).filter(Boolean) as Category[];

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="bg-ink px-4 py-2 text-center text-xs text-white/90">{announcement || t('announce.default')}</div>
      <div className="container-x flex items-center gap-3 py-3">
        <button className="rounded-full p-2 hover:bg-ink/5 lg:hidden" onClick={() => setMobile(true)} aria-label={t('nav.menu')}><Menu size={22} /></button>
        <Logo />
        <div className="mx-6 hidden max-w-md flex-1 lg:block"><SearchBox /></div>
        <div className="ms-auto flex items-center gap-1">
          <div className="hidden sm:block"><LocaleMenu /></div>
          <Link href={user ? '/account' : '/login'} className="rounded-full p-2 hover:bg-ink/5" aria-label={t('nav.account')}><UserIcon size={21} /></Link>
          <Link href="/wishlist" className="relative rounded-full p-2 hover:bg-ink/5" aria-label={t('nav.wishlist')}>
            <Heart size={21} />
            {wish.ids.length > 0 && <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-white">{wish.ids.length}</span>}
          </Link>
          <button onClick={() => cart.setOpen(true)} className="relative rounded-full p-2 hover:bg-ink/5" aria-label={`${t('nav.cart')} (${cart.count})`}>
            <ShoppingBag size={21} />
            {cart.count > 0 && <span data-testid="cart-count" className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-white">{cart.count}</span>}
          </button>
        </div>
      </div>

      {/* desktop navigation with mega menus */}
      <nav className="hidden border-t border-ink/5 lg:block" aria-label="Main" onMouseLeave={() => setMenu(null)}>
        <ul className="container-x flex items-center justify-center gap-1 xl:gap-3">
          <li><Link href="/" className="block px-2.5 py-3 text-[13px] font-medium hover:text-brand xl:px-3">{t('nav.home')}</Link></li>
          {NAV.map((n) => {
            const mega = megaFor(n);
            return (
              <li key={n.key} onMouseEnter={() => setMenu(mega.length ? n.key : null)} className="relative">
                <Link
                  href={n.href} onFocus={() => setMenu(mega.length ? n.key : null)} aria-expanded={mega.length ? menu === n.key : undefined}
                  className={`flex items-center gap-1 px-2.5 py-3 text-[13px] font-medium hover:text-brand xl:px-3 ${n.key === 'nav.sale' ? 'text-brand' : ''}`}
                >
                  {t(n.key)} {mega.length > 0 && <ChevronDown size={13} aria-hidden />}
                </Link>
                {menu === n.key && mega.length > 0 && (
                  <div className="card absolute start-0 top-full z-50 w-[28rem] p-5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      {mega.map((parent) => (
                        <div key={parent.id} className={mega.length === 1 ? 'col-span-2' : ''}>
                          <Link href={`/shop?category=${parent.slug}`} onClick={() => setMenu(null)} className="mb-2 block font-serif text-lg hover:text-brand">{catName(parent, locale)}</Link>
                          <ul className={`grid gap-1 ${mega.length === 1 ? 'grid-cols-2' : ''}`}>
                            {parent.children.map((c) => (
                              <li key={c.id}><Link href={`/shop?category=${c.slug}`} onClick={() => setMenu(null)} className="block rounded px-1 py-1 text-sm text-ink-soft hover:text-brand">{catName(c, locale)}</Link></li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* mobile drawer */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-cream p-5">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button onClick={() => setMobile(false)} aria-label="Close menu" className="rounded-full p-2 hover:bg-ink/5"><X size={22} /></button>
            </div>
            <SearchBox onDone={() => setMobile(false)} />
            <ul className="mt-4 divide-y divide-ink/10">
              <li><Link href="/" onClick={() => setMobile(false)} className="block py-3.5 font-medium">{t('nav.home')}</Link></li>
              {NAV.map((n) => {
                const mega = megaFor(n);
                return (
                  <li key={n.key}>
                    <div className="flex items-center justify-between">
                      <Link href={n.href} onClick={() => setMobile(false)} className={`block flex-1 py-3.5 font-medium ${n.key === 'nav.sale' ? 'text-brand' : ''}`}>{t(n.key)}</Link>
                      {mega.length > 0 && (
                        <button onClick={() => setMExpand(mExpand === n.key ? null : n.key)} aria-expanded={mExpand === n.key} aria-label={`${t(n.key)} +`} className="p-3">
                          <ChevronDown size={18} className={mExpand === n.key ? 'rotate-180' : ''} />
                        </button>
                      )}
                    </div>
                    {mExpand === n.key && (
                      <ul className="mb-3 ms-3 space-y-1 border-s border-ink/15 ps-4">
                        {mega.flatMap((p) => p.children).map((c) => (
                          <li key={c.id}><Link href={`/shop?category=${c.slug}`} onClick={() => setMobile(false)} className="block py-1.5 text-sm text-ink-soft">{catName(c, locale)}</Link></li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 sm:hidden"><LocaleMenu /></div>
          </div>
        </div>
      )}
    </header>
  );
}
