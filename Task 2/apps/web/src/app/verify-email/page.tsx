'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthShell } from '@/components/AuthCard';
import { useAuth } from '@/components/providers';
import { api } from '@/lib/api';

function Verify() {
  const token = useSearchParams().get('token') ?? '';
  const { refresh } = useAuth();
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api('/auth/verify-email', { method: 'POST', json: { token } })
      .then(() => { setState('ok'); refresh(); })
      .catch((e) => { setMsg(e.message); setState('err'); });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AuthShell title="Email verification">
      {state === 'loading' && <p>Verifying...</p>}
      {state === 'ok' && <p role="status">Your email address is verified. <Link className="text-brand underline" href="/account">Go to your account</Link></p>}
      {state === 'err' && <p role="alert" className="text-red-700">{msg}</p>}
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
