import { Suspense } from 'react';
import AuthForm from '@/components/AuthCard';

export const metadata = { title: 'Create account' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
