'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Development-only stand-in for the Paystack checkout page. The backend only issues links
 * to this page when PAYSTACK_SECRET_KEY is unset AND NODE_ENV is not production.
 */
function MockPay() {
  const sp = useSearchParams();
  const reference = sp.get('reference') ?? '';
  const order = sp.get('order') ?? '';
  const email = sp.get('email') ?? '';
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []); // buttons stay disabled until the page is interactive
  const done = async (outcome: 'success' | 'failed') => {
    try {
      await api('/payments/dev/complete', { method: 'POST', json: { reference, outcome } });
      window.location.href = `/order/${order}?email=${encodeURIComponent(email)}&reference=${reference}`;
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="card w-full max-w-md space-y-5 p-8 text-center">
        <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">TEST MODE: no real money is charged</p>
        <h1 className="text-3xl">Test payment gateway</h1>
        <p className="text-sm text-ink-soft">Order {order}. The store owner can switch on real Paystack payments at any time.</p>
        <button className="btn-dark w-full" disabled={!ready} onClick={() => done('success')} data-testid="mock-success">Simulate successful payment</button>
        <button className="btn-outline w-full" disabled={!ready} onClick={() => done('failed')} data-testid="mock-fail">Simulate failed payment</button>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><MockPay /></Suspense>;
}
