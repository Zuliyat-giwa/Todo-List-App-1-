import { Suspense } from 'react';
import ShopClient from '@/components/ShopClient';

export const metadata = { title: 'Sale' };
const preset = { onSale: 'true' };

export default function SalePage() {
  return (
    <Suspense fallback={null}>
      <ShopClient preset={preset} title="Sale" />
    </Suspense>
  );
}
