import { Suspense } from 'react';
import ShopClient from '@/components/ShopClient';

export const metadata = { title: 'New Arrivals' };
const preset = { isNew: 'true' };

export default function NewArrivalsPage() {
  return (
    <Suspense fallback={null}>
      <ShopClient preset={preset} title="New Arrivals" />
    </Suspense>
  );
}
