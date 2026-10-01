'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, Country, Quote, User } from '@/lib/api';
import { formatMoney, Locale, translate } from '@/lib/i18n';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): the app keeps working in memory */
  }
};

// ------------------------------------------------------------------ toast
interface ToastCtx { toast: (msg: string, kind?: 'ok' | 'err') => void }
const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

// ------------------------------------------------------------------ prefs
interface Prefs {
  locale: Locale; currency: string; country: string; countries: Country[];
  setLocale: (l: Locale) => void; setCurrency: (c: string) => void; setCountry: (code: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  money: (minor: number) => string;
  currencies: string[];
}
const PrefsContext = createContext<Prefs>(null as any);
export const usePrefs = () => useContext(PrefsContext);

// ------------------------------------------------------------------- auth
interface AuthCtx { user: User | null; ready: boolean; refresh: () => Promise<User | null>; logout: () => Promise<void>; setUser: (u: User | null) => void }
const AuthContext = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(AuthContext);

// ------------------------------------------------------------------- cart
export interface CartItem { variantId: string; quantity: number }
interface CartCtx {
  items: CartItem[]; count: number; quote: Quote | null; quoting: boolean; open: boolean; setOpen: (o: boolean) => void;
  add: (variantId: string, qty?: number) => void; setQty: (variantId: string, qty: number) => void; remove: (variantId: string) => void; clear: () => void;
  code: string; applyCode: (c: string) => void; refreshQuote: () => void;
}
const CartContext = createContext<CartCtx>(null as any);
export const useCart = () => useContext(CartContext);

// --------------------------------------------------------------- wishlist
interface WishCtx { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => Promise<void> }
const WishContext = createContext<WishCtx>(null as any);
export const useWishlist = () => useContext(WishContext);

export default function Providers({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const toast = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // ---------------- prefs
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [currency, setCurrencyState] = useState('NGN');
  const [country, setCountryState] = useState('NG');
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    const p = load<{ locale?: Locale; currency?: string; country?: string }>('modeza.prefs', {});
    if (p.locale) setLocaleState(p.locale);
    if (p.currency) setCurrencyState(p.currency);
    if (p.country) setCountryState(p.country);
    api<Country[]>('/content/countries').then(setCountries).catch(() => {});
  }, []);

  // ---------------- auth
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User | null }>('/auth/me');
      setUser(r.user);
      return r.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    (next: { locale?: Locale; currency?: string; country?: string }) => {
      const merged = { locale, currency, country, ...next };
      save('modeza.prefs', merged);
      document.cookie = `modeza_locale=${merged.locale}; path=/; max-age=31536000; samesite=lax`;
      if (user) api('/account/profile', { method: 'PATCH', json: merged }).catch(() => {});
    },
    [locale, currency, country, user],
  );

  // signed-in users' saved preferences win on login
  useEffect(() => {
    if (!user) return;
    setLocaleState(user.language as Locale);
    setCurrencyState(user.currency);
    setCountryState(user.country);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const prefs = useMemo<Prefs>(() => {
    const rate = countries.find((c) => c.currency === currency)?.rateFromBase ?? 1;
    const currencies = [...new Set(['NGN', ...countries.map((c) => c.currency)])];
    return {
      locale, currency, country, countries, currencies,
      setLocale: (l) => { setLocaleState(l); persist({ locale: l }); },
      setCurrency: (c) => { setCurrencyState(c); persist({ currency: c }); },
      setCountry: (code) => {
        const c = countries.find((x) => x.code === code);
        if (!c) return;
        setCountryState(code); setCurrencyState(c.currency); setLocaleState(c.language as Locale);
        persist({ country: code, currency: c.currency, locale: c.language as Locale });
      },
      t: (key, vars) => translate(locale, key, vars),
      money: (minor) => formatMoney(minor, currency, rate, locale),
    };
  }, [locale, currency, country, countries, persist]);

  // ---------------- cart
  const [items, setItems] = useState<CartItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const hydrated = useRef(false);

  useEffect(() => {
    setItems(load<CartItem[]>('modeza.cart', []));
    setCode(load<string>('modeza.code', ''));
    hydrated.current = true;
  }, []);

  // On login: merge the guest cart with the saved server cart.
  const mergedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !hydrated.current || mergedFor.current === user.id) return;
    mergedFor.current = user.id;
    api<{ items: CartItem[] }>('/cart')
      .then(({ items: server }) => {
        setItems((local) => {
          // Same item on both sides: keep the larger quantity so repeated logins never double-count.
          const map = new Map<string, number>();
          for (const i of [...server, ...local]) map.set(i.variantId, Math.max(map.get(i.variantId) ?? 0, i.quantity));
          return [...map].map(([variantId, quantity]) => ({ variantId, quantity }));
        });
      })
      .catch(() => {});
  }, [user]);
  useEffect(() => {
    if (!user) mergedFor.current = null;
  }, [user]);

  // Persist locally and (when signed in) to the server.
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!hydrated.current) return;
    save('modeza.cart', items);
    if (user && mergedFor.current === user.id) {
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => api('/cart', { method: 'PUT', json: { items } }).catch(() => {}), 600);
    }
  }, [items, user]);
  useEffect(() => save('modeza.code', code), [code]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!hydrated.current) return;
    if (!items.length) { setQuote(null); return; }
    let cancelled = false;
    setQuoting(true);
    api<Quote>('/cart/quote', { method: 'POST', json: { items, code: code || undefined, country } })
      .then((q) => !cancelled && setQuote(q))
      .catch((e) => {
        // A variant that no longer exists is dropped so the cart cannot get stuck.
        if (!cancelled && /no longer exists/i.test(e.message)) {
          setItems([]);
        }
      })
      .finally(() => !cancelled && setQuoting(false));
    return () => { cancelled = true; };
  }, [items, code, country, tick]);

  const cart = useMemo<CartCtx>(
    () => ({
      items, quote, quoting, open, setOpen, code,
      count: items.reduce((n, i) => n + i.quantity, 0),
      add: (variantId, qty = 1) => {
        setItems((cur) => {
          const ex = cur.find((i) => i.variantId === variantId);
          return ex ? cur.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i)) : [...cur, { variantId, quantity: qty }];
        });
      },
      setQty: (variantId, qty) => setItems((cur) => (qty < 1 ? cur.filter((i) => i.variantId !== variantId) : cur.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(99, qty) } : i)))),
      remove: (variantId) => setItems((cur) => cur.filter((i) => i.variantId !== variantId)),
      clear: () => { setItems([]); setCode(''); },
      applyCode: (c) => setCode(c.trim().toUpperCase()),
      refreshQuote: () => setTick((n) => n + 1),
    }),
    [items, quote, quoting, open, code],
  );

  // ---------------- wishlist
  const [wish, setWish] = useState<string[]>([]);
  useEffect(() => {
    if (!hydrated.current) return;
    if (user) {
      const local = load<string[]>('modeza.wish', []);
      Promise.all(local.map((id) => api(`/account/wishlist/${id}`, { method: 'POST' }).catch(() => {})))
        .then(() => api<string[]>('/account/wishlist/ids'))
        .then((ids) => { setWish(ids); save('modeza.wish', []); })
        .catch(() => {});
    } else setWish(load<string[]>('modeza.wish', []));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const wishlist = useMemo<WishCtx>(
    () => ({
      ids: wish,
      has: (id) => wish.includes(id),
      toggle: async (id) => {
        const on = wish.includes(id);
        const next = on ? wish.filter((x) => x !== id) : [...wish, id];
        setWish(next);
        if (user) await api(`/account/wishlist/${id}`, { method: on ? 'DELETE' : 'POST' }).catch(() => setWish(wish));
        else save('modeza.wish', next);
      },
    }),
    [wish, user],
  );

  const auth = useMemo<AuthCtx>(
    () => ({
      user, ready, refresh, setUser,
      logout: async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        setUser(null);
        mergedFor.current = null;
        setItems([]);
        setWish([]);
      },
    }),
    [user, ready, refresh],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      <PrefsContext.Provider value={prefs}>
        <AuthContext.Provider value={auth}>
          <CartContext.Provider value={cart}>
            <WishContext.Provider value={wishlist}>
              {children}
              <div className="pointer-events-none fixed bottom-4 start-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 rtl:translate-x-1/2" aria-live="polite">
                {toasts.map((t) => (
                  <div key={t.id} role="status" className={`pointer-events-auto rounded-full px-5 py-3 text-sm text-white shadow-lg ${t.kind === 'err' ? 'bg-red-700' : 'bg-ink'}`}>
                    {t.msg}
                  </div>
                ))}
              </div>
            </WishContext.Provider>
          </CartContext.Provider>
        </AuthContext.Provider>
      </PrefsContext.Provider>
    </ToastContext.Provider>
  );
}
