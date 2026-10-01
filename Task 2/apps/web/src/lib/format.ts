/** Admin screens always work in the store base currency (NGN). Amounts are integer kobo. */
export const ngn = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
export const toMinor = (naira: string | number) => Math.round(Number(naira) * 100);
export const fromMinor = (minor: number) => String(minor / 100);
