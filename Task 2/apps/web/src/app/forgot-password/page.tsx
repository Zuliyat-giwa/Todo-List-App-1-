'use client';

import { FormEvent, useState } from 'react';
import { AuthShell } from '@/components/AuthCard';
import { usePrefs } from '@/components/providers';
import { api } from '@/lib/api';

export default function ForgotPassword() {
  const { t } = usePrefs();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', json: { email } });
      setMsg(r.message);
    } catch (e: any) {
      setErr(e.message);
    }
  };
  return (
    <AuthShell title={t('auth.resetTitle')}>
      {msg ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{msg}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label" htmlFor="email">{t('common.email')}</label><input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          <button className="btn-dark w-full">{t('auth.sendLink')}</button>
        </form>
      )}
    </AuthShell>
  );
}
