import { serverApi, Category, Product } from '@/lib/api';
import { CategoryRail, Hero, Newsletter, ProductRow, PromoBanner, Seasonal, SocialGallery, Testimonials, TrustBar } from '@/components/HomeSections';

export const revalidate = 60;

const list = (qs: string) => serverApi<{ items: Product[] }>(`/products?${qs}`).then((r) => r.items).catch(() => [] as Product[]);

export default async function Home() {
  const [home, categories, women, men, kids, perfumes, books, medicine, eid] = await Promise.all([
    serverApi('/content/home').catch(() => null),
    serverApi<Category[]>('/categories').catch(() => [] as Category[]),
    list('category=women&featured=true&limit=4'),
    list('category=men&limit=4&sort=popular'),
    list('audience=kids&limit=4&sort=popular'),
    list('category=perfumes&limit=4&sort=popular'),
    list('category=islamic-books&limit=4&sort=popular'),
    list('category=prophetic-medicine&limit=4&sort=popular'),
    list('collection=Eid&limit=4'),
  ]);
  const banners = (home?.banners ?? []) as any[];
  const hero = banners.find((b) => b.placement === 'hero');
  const promos = banners.filter((b) => b.placement === 'promo');
  const gallery = [...(home?.bestSellers ?? []), ...(home?.newArrivals ?? [])].map((p: Product) => p.images[1]?.url ?? p.images[0]?.url).filter(Boolean);

  return (
    <>
      <Hero banner={hero} />
      <TrustBar />
      <CategoryRail categories={categories} />
      <ProductRow titleKey="home.newArrivals" products={home?.newArrivals ?? []} href="/new-arrivals" />
      <ProductRow titleKey="home.bestSellers" products={home?.bestSellers ?? []} href="/shop?bestSeller=true&sort=popular" />
      <PromoBanner banner={promos[0]} />
      <ProductRow titleKey="home.featured" products={women} href="/shop?category=women" />
      <ProductRow titleKey="home.men" products={men} href="/shop?category=men" />
      <ProductRow titleKey="home.kids" products={kids} href="/shop?audience=kids" />
      <Seasonal banner={promos[1]} />
      <ProductRow titleKey="home.seasonal" products={eid} href="/shop?collection=Eid" />
      <ProductRow titleKey="home.perfumes" products={perfumes} href="/shop?category=perfumes" />
      <ProductRow titleKey="home.books" products={books} href="/shop?category=islamic-books" />
      <ProductRow titleKey="home.medicine" products={medicine} href="/shop?category=prophetic-medicine" />
      <Testimonials items={home?.testimonials ?? []} />
      <Newsletter />
      <SocialGallery images={gallery} />
    </>
  );
}
