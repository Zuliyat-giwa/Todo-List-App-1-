import { randomBytes, createHash } from 'crypto';

/**
 * Strip HTML from free text (XSS defence in depth; the UI also escapes all output).
 * Script/style bodies are dropped entirely, remaining tags are removed until stable.
 */
export const clean = (s?: string | null) => {
  if (s == null) return s;
  let out = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/<\/?[a-z!?][^>]*>?/gi, '');
  }
  // drop control characters (keep tab/newline/carriage return)
  return [...out]
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c > 31 || c === 9 || c === 10 || c === 13;
    })
    .join('')
    .trim();
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const newToken = () => {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
};

export function orderNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `MZ-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Format minor units (kobo) as a plain NGN string for emails. */
export const ngn = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(minor / 100);
