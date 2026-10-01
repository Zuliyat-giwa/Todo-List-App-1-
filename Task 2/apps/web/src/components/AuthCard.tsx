'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, ReactNode, useState } from 'react';
import { api, User } from '@/lib/api';
import { useAuth, usePrefs } from './providers';

export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_state: 'Sign-in session expired. Please try again.',
  google_token: 'Google could not verify your sign-in. Please try again.',
  google_email: 'Your Google email address is not verified.',
  google_failed: 'Google sign-in failed. Please try again.',
};

export function GoogleButton() {
  const { t } = usePrefs();
  return (
    <a href="/api/auth/google" className="btn-outline w-full" data-testid="google-signin">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
        <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {t('auth.google')}
    </a>
  );
}

export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-14">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl">{title}</h1>
        <div className="mt-6 space-y-5">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-ink-mute">{footer}</p>}
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { t } = usePrefs();
  const { setUser } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState(GOOGLE_ERRORS[sp.get('error') ?? ''] ?? '');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', json: isLogin ? { email: f.email, password: f.password } : f });
      setUser(r.user);
      router.push(r.user.role === 'ADMIN' && next === '/account' ? '/admin' : next);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={isLogin ? t('auth.login') : t('auth.register')}
      footer={
        isLogin ? (
          <>{t('auth.noAccount')} <Link className="text-brand underline" href={`/register?next=${encodeURIComponent(next)}`}>{t('auth.register')}</Link></>
        ) : (
          <>{t('auth.haveAccount')} <Link className="text-brand underline" href={`/login?next=${encodeURIComponent(next)}`}>{t('auth.login')}</Link></>
        )
      }
    >
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-ink-mute"><span className="h-px flex-1 bg-ink/10" />{t('auth.or')}<span className="h-px flex-1 bg-ink/10" /></div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!isLogin && (
          <div><label className="label" htmlFor="name">{t('auth.name')}</label><input id="name" className="input" required minLength={2} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        )}
        <div><label className="label" htmlFor="email">{t('common.email')}</label><input id="email" type="email" className="input" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" className="input" required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          {!isLogin && <p className="mt-1 text-xs text-ink-mute">At least 8 characters</p>}
        </div>
        {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{err}</p>}
        <button className="btn-dark w-full" disabled={busy}>{busy ? t('common.loading') : isLogin ? t('auth.login') : t('auth.register')}</button>
        {isLogin && <p className="text-center text-sm"><Link className="text-brand underline" href="/forgot-password">{t('auth.forgot')}</Link></p>}
      </form>
    </AuthShell>
  );
}
