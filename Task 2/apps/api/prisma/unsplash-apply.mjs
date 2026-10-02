// Applies curated Unsplash photos (hotlinked per Unsplash API guidelines; each use is reported to Unsplash).
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const KEY = process.env.UNSPLASH_KEY;
const cache = JSON.parse(readFileSync('unsplash-cache.json', 'utf8'));
const map = JSON.parse(readFileSync('prisma/unsplash-map.json', 'utf8'));
const prisma = new PrismaClient();
const used = new Set();
const fit = (u) => `${u}&w=900&h=1125&fit=crop&crop=faces%2Centropy&q=80&auto=format`;
let done = 0;
const missing = [];

for (const [name, picks] of Object.entries(map)) {
  const p = await prisma.product.findFirst({ where: { name } });
  if (!p) { missing.push(name); continue; }
  const chosen = [];
  for (const [q, i] of picks) {
    const ph = cache[q]?.[i];
    if (ph && !used.has(ph.id)) { used.add(ph.id); chosen.push(ph); }
  }
  if (!chosen.length) continue;
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: p.id } }),
    prisma.productImage.createMany({ data: chosen.map((ph, n) => ({ productId: p.id, url: fit(ph.url), alt: `${name} (photo by ${ph.by} on Unsplash)`, sortOrder: n })) }),
    prisma.product.update({ where: { id: p.id }, data: { isActive: true } }),
  ]);
  for (const ph of chosen) fetch(ph.dl, { headers: { Authorization: `Client-ID ${KEY}` } }).catch(() => {});
  done++;
}

// category tiles and banners reuse product photos
const cats = await prisma.category.findMany();
for (const c of cats) {
  const ids = [c.id, ...cats.filter((k) => k.parentId === c.id).map((k) => k.id)];
  const pr = await prisma.product.findFirst({
    where: { categoryId: { in: ids }, isActive: true, images: { some: {} } },
    orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });
  if (pr) await prisma.category.update({ where: { id: c.id }, data: { imageUrl: pr.images[0].url } });
}
const img = async (n) => (await prisma.productImage.findFirst({ where: { product: { name: n } }, orderBy: { sortOrder: 'asc' } }))?.url;
const b = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
const urls = [await img('Classic Open Abaya'), await img('Pleated Maxi Modest Dress'), await img('Ramadan Gift Hamper')];
for (let i = 0; i < 3; i++) if (b[i] && urls[i]) await prisma.banner.update({ where: { id: b[i].id }, data: { imageUrl: urls[i] } });

console.log('updated', done, 'products; missing names:', missing, '| active:', await prisma.product.count({ where: { isActive: true } }), '| inactive:', await prisma.product.count({ where: { isActive: false } }));
await prisma.$disconnect();
