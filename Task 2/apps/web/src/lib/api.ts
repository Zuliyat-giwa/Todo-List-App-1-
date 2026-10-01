export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Browser calls go through the same-origin /api proxy; server components call the backend directly. */
const base = () => (typeof window === 'undefined' ? (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '') : '/api');

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(base() + path, {
    credentials: 'include',
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join('. ') : data?.message || 'Something went wrong. Please try again.';
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

/** For server components: cached for a minute so the storefront stays fast. */
export const serverApi = <T = any>(path: string, revalidate = 60) =>
  api<T>(path, { next: { revalidate } } as RequestInit);

// ---------------------------------------------------------------- types
export interface Variant { id: string; sku: string; size: string | null; color: string | null; priceMinor: number; stock: number }
export interface Product {
  id: string; name: string; nameAr: string | null; slug: string; description: string; descriptionAr: string | null; audience: string; brand: string | null; material: string | null;
  collection: string | null; sku: string; priceMinor: number; salePriceMinor: number | null; currentPriceMinor: number; onSale: boolean; ratingAvg: number; ratingCount: number;
  isFeatured: boolean; isNewArrival: boolean; isBestSeller: boolean; inStock: boolean; isActive?: boolean;
  category: { id: string; name: string; nameAr: string | null; slug: string; parent: { name: string; slug: string } | null };
  images: { url: string; alt: string | null }[]; variants: Variant[];
  attributes?: { key: string; value: string }[]; related?: Product[];
}
export interface Category { id: string; name: string; nameAr: string | null; slug: string; imageUrl: string | null; productCount: number; children: Category[] }
export interface QuoteLine {
  variantId: string; productId: string; slug: string; name: string; sku: string; size: string | null; color: string | null; imageUrl: string | null;
  unitMinor: number; compareAtMinor: number; quantity: number; stock: number; lineMinor: number; issue?: 'OUT_OF_STOCK' | 'LIMITED_STOCK' | 'UNAVAILABLE';
}
export interface Quote {
  lines: QuoteLine[]; subtotalMinor: number; discountMinor: number; discountCode: string | null; discountError?: string; shippingMinor: number;
  shippingMethodId: string | null; taxMinor: number; taxPercent: number; totalMinor: number; valid: boolean;
}
export interface Order {
  id: string; orderNumber: string; status: string; email: string; customerName: string; phone: string; currency: string; subtotalMinor: number; discountMinor: number;
  discountCode: string | null; shippingMinor: number; taxMinor: number; totalMinor: number; shippingMethod: string; createdAt: string;
  address: { country: string; state: string; city: string; street: string; postalCode: string | null; notes: string | null };
  items: { id: string; productName: string; sku: string; size: string | null; color: string | null; imageUrl: string | null; unitMinor: number; quantity: number }[];
  payment: { status: string; provider: string; paidAt: string | null } | null;
  shipment: { carrier: string | null; trackingNumber: string | null; status: string; shippedAt: string | null; deliveredAt: string | null } | null;
}
export interface User { id: string; email: string; name: string; phone: string | null; role: 'CUSTOMER' | 'ADMIN'; avatarUrl: string | null; emailVerified: boolean; language: string; currency: string; country: string; hasPassword: boolean }
export interface Country { code: string; name: string; language: string; currency: string; rateFromBase: number; taxPercent: number }
export interface ShippingMethod { id: string; name: string; priceMinor: number; freeOverMinor: number | null; minDays: number; maxDays: number }
