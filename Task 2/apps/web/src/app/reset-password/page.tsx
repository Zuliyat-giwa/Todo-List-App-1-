'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthShell } from '@/components/AuthCard';
import { api } from '@/lib/api';

function Form() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await api('/auth/reset-password', { method: 'POST', json: { token, password } });
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    }
  };
  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <p role="status" className="text-sm">Your password has been updated. <Link href="/login" className="text-brand underline">Sign in</Link></p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label" htmlFor="pw">New password</label><input id="pw" type="password" required minLength={8} autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          <button className="btn-dark w-full" disabled={!token}>Update password</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  );
}
