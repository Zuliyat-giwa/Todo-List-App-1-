import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter, Playfair_Display, Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';
import { serverApi, Category } from '@/lib/api';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Providers from '@/components/providers';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const arabic = Noto_Naskh_Arabic({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Modeza | Modest Fashion, Fragrance & Islamic Lifestyle', template: '%s | Modeza' },
  description: 'Premium abayas, hijabs, thobes, kids wear, gold jewelry, Arabian perfumes, Islamic books and prophetic medicine.',
};

async function loadShell() {
  try {
    return await serverApi<Category[]>('/categories');
  } catch {
    return [] as Category[];
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get('modeza_locale')?.value === 'ar' ? 'ar' : 'en';
  const categories = await loadShell();
  const store = await serverApi<{ announcement?: string }>('/content/store').catch(() => ({}) as { announcement?: string });
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${sans.variable} ${serif.variable} ${arabic.variable}`}>
      <body>
        <Providers initialLocale={locale}>
          <Header categories={categories} announcement={store.announcement} />
          <main id="main" className="min-h-[60vh]">{children}</main>
          <Footer categories={categories.map((c) => ({ name: c.name, slug: c.slug }))} />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
