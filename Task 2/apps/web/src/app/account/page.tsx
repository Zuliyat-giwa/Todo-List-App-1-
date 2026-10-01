'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { MailWarning, Package, Trash2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useAuth, usePrefs, useToast } from '@/components/providers';
import { api, Order, Product } from '@/lib/api';

const TABS = ['overview', 'orders', 'addresses', 'wishlist', 'settings'] as const;
type Tab = (typeof TABS)[number];

function StatusPill({ s }: { s: string }) {
  const tone = s === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : s === 'CANCELLED' || s === 'REFUNDED' ? 'bg-red-100 text-red-800' : s === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{s.replace('_', ' ').toLowerCase()}</span>;
}

function Orders({ orders }: { orders: Order[] | null }) {
  const { t, money } = usePrefs();
  if (!orders) return <div className="skeleton h-40" />;
  if (!orders.length) return <div className="card p-10 text-center"><Package className="mx-auto text-ink-mute" /><p className="mt-3">{t('account.noOrders')}</p><Link href="/shop" className="btn-dark mt-5">{t('cart.continue')}</Link></div>;
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="card flex flex-wrap items-center gap-4 p-5" data-testid="order-row">
          <div className="flex -space-x-3 rtl:space-x-reverse">{o.items.slice(0, 3).map((i) => <img key={i.id} src={i.imageUrl ?? ''} alt="" className="h-14 w-12 rounded-lg border-2 border-white object-cover" />)}</div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{o.orderNumber}</p>
            <p className="text-ink-mute">{new Date(o.createdAt).toLocaleDateString()} - {o.items.reduce((n, i) => n + i.quantity, 0)} items</p>
            {o.shipment?.trackingNumber && <p className="text-ink-mute">Tracking: {o.shipment.trackingNumber}</p>}
          </div>
          <StatusPill s={o.status} />
          <span className="font-semibold">{money(o.totalMinor)}</span>
          <Link href={`/order/${o.orderNumber}`} className="btn-outline !px-4 !py-2">Details</Link>
        </li>
      ))}
    </ul>
  );
}

interface Addr { id: string; label: string | null; fullName: string; phone: string; country: string; state: string; city: string; street: string; postalCode: string | null; isDefault: boolean }

function Addresses() {
  const { toast } = useToast();
  const { countries } = usePrefs();
  const [list, setList] = useState<Addr[] | null>(null);
  const [f, setF] = useState({ fullName: '', phone: '', country: 'NG', state: '', city: '', street: '', postalCode: '', label: '' });
  const load = () => api<Addr[]>('/account/addresses').then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/account/addresses', { method: 'POST', json: { ...f, postalCode: f.postalCode || undefined, label: f.label || undefined } });
      setF({ ...f, street: '', state: '', city: '', postalCode: '', label: '' });
      toast('Address saved'); load();
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const input = (k: keyof typeof f, label: string, req = true) => (
    <div><label className="label" htmlFor={`ad-${k}`}>{label}</label><input id={`ad-${k}`} className="input" required={req} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        {list === null ? <div className="skeleton h-32" /> : list.length === 0 ? <p className="text-ink-mute">No saved addresses yet.</p> : list.map((a) => (
          <div key={a.id} className="card flex justify-between gap-4 p-5 text-sm">
            <div>
              <p className="font-semibold">{a.label || a.fullName} {a.isDefault && <span className="ms-2 rounded-full bg-cream-200 px-2 py-0.5 text-xs">Default</span>}</p>
              <p className="text-ink-soft">{a.fullName}, {a.phone}<br />{a.street}, {a.city}, {a.state}, {a.country} {a.postalCode}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {!a.isDefault && <button className="text-brand underline" onClick={async () => { await api(`/account/addresses/${a.id}`, { method: 'PUT', json: { ...a, postalCode: a.postalCode || undefined, label: a.label || undefined, isDefault: true, id: undefined, userId: undefined, createdAt: undefined, updatedAt: undefined } }).catch((e) => toast(e.message, 'err')); load(); }}>Make default</button>}
              <button aria-label="Delete address" onClick={async () => { await api(`/account/addresses/${a.id}`, { method: 'DELETE' }); load(); }}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="card space-y-4 p-6">
        <h3 className="font-sans font-semibold">Add an address</h3>
        {input('label', 'Label (e.g. Home)', false)}{input('fullName', 'Full name')}{input('phone', 'Phone')}
        <div><label className="label" htmlFor="ad-country">Country</label><select id="ad-country" className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{(countries.length ? countries : [{ code: 'NG', name: 'Nigeria' }]).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-4">{input('state', 'State')}{input('city', 'City')}</div>
        {input('street', 'Street address')}{input('postalCode', 'Postal code', false)}
        <button className="btn-dark w-full">Save address</button>
      </form>
    </div>
  );
}

function Settings() {
  const { user, setUser, logout } = useAuth();
  const { t, locale, currency, country, countries, currencies, setLocale, setCurrency, setCountry } = usePrefs();
  const { toast } = useToast();
  const [p, setP] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const router = useRouter();
  if (!user) return null;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form className="card space-y-4 p-6" onSubmit={async (e) => { e.preventDefault(); try { const r = await api<{ user: any }>('/account/profile', { method: 'PATCH', json: { name: p.name, phone: p.phone } }); setUser(r.user); toast('Profile updated'); } catch (e: any) { toast(e.message, 'err'); } }}>
        <h3 className="font-sans font-semibold">Profile</h3>
        <div><label className="label" htmlFor="pf-name">Full name</label><input id="pf-name" className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="pf-email">Email</label><input id="pf-email" className="input" value={user.email} disabled /></div>
        <div><label className="label" htmlFor="pf-phone">Phone</label><input id="pf-phone" className="input" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
        <button className="btn-dark">{t('common.save')}</button>
      </form>
      <form className="card space-y-4 p-6" onSubmit={async (e) => { e.preventDefault(); try { await api('/auth/change-password', { method: 'POST', json: { currentPassword: pw.currentPassword || undefined, newPassword: pw.newPassword } }); toast('Password updated'); setPw({ currentPassword: '', newPassword: '' }); } catch (e: any) { toast(e.message, 'err'); } }}>
        <h3 className="font-sans font-semibold">{user.hasPassword ? 'Change password' : 'Set a password'}</h3>
        {user.hasPassword && <div><label className="label" htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" autoComplete="current-password" className="input" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>}
        <div><label className="label" htmlFor="pw-new">New password</label><input id="pw-new" type="password" autoComplete="new-password" minLength={8} className="input" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
        <button className="btn-dark">{t('common.save')}</button>
      </form>
      <div className="card space-y-4 p-6">
        <h3 className="font-sans font-semibold">{t('account.prefs')}</h3>
        <div><label className="label" htmlFor="pr-country">{t('locale.country')}</label><select id="pr-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="pr-lang">{t('locale.language')}</label><select id="pr-lang" className="input" value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'ar')}><option value="en">English</option><option value="ar">العربية</option></select></div>
        <div><label className="label" htmlFor="pr-cur">{t('locale.currency')}</label><select id="pr-cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{currencies.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="card space-y-4 p-6">
        <h3 className="font-sans font-semibold">Session</h3>
        <button className="btn-outline" onClick={async () => { await logout(); router.push('/'); }}>{t('auth.logout')}</button>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, ready } = useAuth();
  const { t, money } = usePrefs();
  const { toast } = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (TABS.includes(sp.get('tab') as Tab) ? sp.get('tab') : 'overview') as Tab;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [recent, setRecent] = useState<Product[]>([]);
  const [wish, setWish] = useState<Product[] | null>(null);

  useEffect(() => { if (ready && !user) router.replace('/login?next=/account'); }, [ready, user, router]);
  useEffect(() => {
    if (!user) return;
    api<Order[]>('/orders').then(setOrders).catch(() => setOrders([]));
    api<Product[]>('/account/recently-viewed').then(setRecent).catch(() => {});
    api<Product[]>('/account/wishlist').then(setWish).catch(() => setWish([]));
  }, [user]);

  if (!user) return <div className="container-x py-20"><div className="skeleton h-48" /></div>;
  const spent = (orders ?? []).filter((o) => ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)).reduce((n, o) => n + o.totalMinor, 0);

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl sm:text-5xl">{t('account.title')}</h1>
      <p className="mt-2 text-ink-mute">Welcome back, {user.name.split(' ')[0]}</p>
      {!user.emailVerified && (
        <div role="status" className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <MailWarning size={18} /> Please verify your email address.
          <button className="underline" onClick={() => api('/auth/resend-verification', { method: 'POST' }).then(() => toast('Verification email sent')).catch((e) => toast(e.message, 'err'))}>Resend email</button>
        </div>
      )}
      {user.role === 'ADMIN' && <Link href="/admin" className="btn-brand mt-5">Open admin dashboard</Link>}
      <nav className="mt-8 flex gap-2 overflow-x-auto" aria-label="Account sections">
        {TABS.map((k) => <Link key={k} href={`/account?tab=${k}`} aria-current={tab === k} className={`chip whitespace-nowrap ${tab === k ? 'chip-on' : ''}`}>{t(`account.${k}`)}</Link>)}
      </nav>
      <div className="mt-8">
        {tab === 'overview' && (
          <div className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-6"><p className="label">{t('account.orders')}</p><p className="font-serif text-4xl">{orders?.length ?? '-'}</p></div>
              <div className="card p-6"><p className="label">Total spent</p><p className="font-serif text-4xl">{money(spent)}</p></div>
              <div className="card p-6"><p className="label">{t('account.wishlist')}</p><p className="font-serif text-4xl">{wish?.length ?? '-'}</p></div>
            </div>
            <section><h2 className="mb-4 text-2xl">Latest orders</h2><Orders orders={orders ? orders.slice(0, 3) : null} /></section>
            {recent.length > 0 && <section><h2 className="mb-4 text-2xl">{t('account.recent')}</h2><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{recent.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}</div></section>}
          </div>
        )}
        {tab === 'orders' && <Orders orders={orders} />}
        {tab === 'addresses' && <Addresses />}
        {tab === 'wishlist' && (wish === null ? <div className="skeleton h-40" /> : wish.length === 0 ? <p className="text-ink-mute">Your wishlist is empty.</p> : <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{wish.map((p) => <ProductCard key={p.id} p={p} />)}</div>)}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return <Suspense fallback={null}><Dashboard /></Suspense>;
}
