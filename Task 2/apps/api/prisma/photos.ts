/**
 * Replaces the placeholder illustrations with real stock photos from Pixabay (free for commercial use,
 * no attribution required). Photos are DOWNLOADED into apps/web/public/products/photos (Pixabay asks that
 * images not be hot-linked). Products with no relevant photo keep their illustration.
 *
 *   PIXABAY_KEY=... npx ts-node prisma/photos.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const KEY = process.env.PIXABAY_KEY;
if (!KEY) throw new Error('Set PIXABAY_KEY');
const prisma = new PrismaClient();
const OUT = join(__dirname, '..', '..', 'web', 'public', 'products', 'photos');
mkdirSync(OUT, { recursive: true });

/** category slug -> search queries + tags a photo must contain at least one of (and none of `ban`). */
const W = ['hijab', 'abaya', 'muslim', 'veil', 'headscarf', 'islamic', 'arab'];
const BAN = ['yoga', 'nude', 'bikini', 'lingerie', 'rosary', 'catholic', 'christian', 'buddha', 'wedding dress'];
const MAP: Record<string, { q: string[]; need: string[] }> = {
  abayas: { q: ['abaya', 'muslim woman fashion', 'abaya dubai'], need: W },
  'prayer-dresses': { q: ['muslim woman praying', 'muslim woman hijab'], need: W },
  'jilbabs-and-khimars': { q: ['muslim woman hijab', 'hijab woman portrait'], need: W },
  hijabs: { q: ['hijab woman', 'hijab fashion', 'headscarf woman'], need: W },
  'hijab-caps-and-undercaps': { q: ['hijab woman', 'headscarf'], need: W },
  niqabs: { q: ['niqab', 'veil woman', 'muslim woman'], need: W },
  'modest-dresses': { q: ['muslim woman fashion', 'modest fashion woman', 'hijab model'], need: W },
  'thobes-and-jubbas': { q: ['thobe', 'arab man traditional', 'muslim man'], need: ['thobe', 'arab', 'muslim', 'islamic', 'saudi'] },
  kaftans: { q: ['arab man traditional', 'muslim man'], need: ['thobe', 'arab', 'muslim', 'islamic', 'man'] },
  'islamic-clothing-sets': { q: ['muslim man', 'arab man'], need: ['thobe', 'arab', 'muslim', 'islamic'] },
  'boys-thobes-and-clothing': { q: ['muslim boy', 'arab boy', 'muslim child'], need: ['boy', 'child', 'kid', 'muslim', 'arab'] },
  'boys-prayer-outfits': { q: ['muslim boy praying', 'muslim child'], need: ['boy', 'child', 'kid', 'muslim', 'islam'] },
  'girls-abayas-and-hijabs': { q: ['muslim girl hijab', 'hijab child', 'little girl hijab'], need: ['girl', 'child', 'kid', 'hijab', 'muslim'] },
  'girls-modest-dresses': { q: ['muslim girl', 'little girl hijab'], need: ['girl', 'child', 'kid', 'hijab', 'muslim'] },
  'matching-family-sets': { q: ['muslim family', 'muslim mother daughter'], need: ['family', 'mother', 'daughter', 'muslim', 'hijab'] },
  'kids-accessories-and-toys': { q: ['wooden toys children', 'alphabet blocks'], need: ['toy', 'blocks', 'wooden', 'alphabet'] },
  watches: { q: ['wristwatch', 'luxury watch', 'wrist watch'], need: ['watch', 'wristwatch', 'timepiece'] },
  'handbags-and-wallets': { q: ['handbag', 'leather bag', 'leather wallet'], need: ['handbag', 'bag', 'purse', 'wallet', 'leather'] },
  'hijab-pins-and-brooches': { q: ['brooch', 'pearl brooch', 'jewelry pin'], need: ['brooch', 'pin', 'jewel', 'pearl'] },
  'prayer-beads-tasbih': { q: ['tasbih', 'misbaha', 'islamic prayer beads'], need: ['tasbih', 'misbaha', 'islam', 'muslim', 'prayer beads'] },
  'rings-and-bracelets': { q: ['bracelet jewelry', 'ring jewelry'], need: ['bracelet', 'ring', 'jewel'] },
  'gold-necklaces': { q: ['gold necklace', 'gold chain'], need: ['necklace', 'chain', 'gold', 'jewel'] },
  'gold-bracelets': { q: ['gold bracelet', 'gold bangle'], need: ['bracelet', 'bangle', 'gold', 'jewel'] },
  'gold-rings': { q: ['gold ring', 'ring jewelry'], need: ['ring', 'gold', 'jewel'] },
  earrings: { q: ['gold earrings', 'earrings'], need: ['earring', 'jewel', 'gold'] },
  'jewelry-sets': { q: ['jewelry set', 'gold jewelry'], need: ['jewel', 'gold', 'necklace'] },
  'oud-perfumes': { q: ['perfume bottle', 'luxury perfume', 'oud'], need: ['perfume', 'fragrance', 'oud', 'bottle'] },
  'attars-and-perfume-oils': { q: ['essential oil bottle', 'perfume oil', 'attar'], need: ['perfume', 'oil', 'essential', 'attar', 'bottle'] },
  'bakhoor-and-incense': { q: ['incense burner', 'incense smoke', 'bakhoor'], need: ['incense', 'bakhoor', 'burner', 'smoke', 'aroma'] },
  musk: { q: ['perfume bottle', 'fragrance bottle'], need: ['perfume', 'fragrance', 'bottle'] },
  'perfume-gift-sets': { q: ['perfume gift set', 'perfume bottles'], need: ['perfume', 'fragrance', 'gift'] },
  'quran-and-tafsir': { q: ['quran book', 'holy quran', 'quran'], need: ['quran', 'islam', 'muslim'] },
  hadith: { q: ['islamic book', 'quran book'], need: ['quran', 'islam', 'muslim', 'book'] },
  'seerah-and-history': { q: ['islamic book', 'old arabic book', 'islamic manuscript'], need: ['islam', 'arabic', 'book', 'quran'] },
  'aqeedah-and-fiqh': { q: ['islamic book', 'quran reading'], need: ['islam', 'quran', 'muslim', 'book'] },
  'books-for-muslim-women': { q: ['muslim woman reading', 'hijab woman reading book'], need: ['read', 'book', 'hijab', 'muslim'] },
  'kids-islamic-books': { q: ['muslim child reading', 'child reading quran'], need: ['child', 'kid', 'girl', 'boy', 'quran', 'book'] },
  'arabic-learning': { q: ['arabic calligraphy', 'arabic alphabet', 'arabic book'], need: ['arabic', 'calligraphy', 'book'] },
  'journals-and-planners': { q: ['journal notebook', 'planner notebook pen'], need: ['notebook', 'journal', 'planner', 'diary'] },
  parenting: { q: ['muslim family', 'mother child hijab'], need: ['family', 'mother', 'child', 'muslim', 'hijab'] },
  'prayer-mats': { q: ['prayer rug', 'islamic prayer mat', 'prayer carpet mosque'], need: ['rug', 'carpet', 'prayer rug', 'prayer mat', 'islamic prayer', 'mosque'] },
  'quran-stands': { q: ['quran stand', 'quran book'], need: ['quran', 'stand', 'islam'] },
  'wall-decor': { q: ['arabic calligraphy', 'islamic art'], need: ['calligraphy', 'arabic', 'islamic', 'art'] },
  'gift-boxes': { q: ['gift box', 'gift box ribbon'], need: ['gift', 'box', 'present'] },
  'hajj-and-umrah-essentials': { q: ['kaaba', 'hajj mecca', 'mecca pilgrims'], need: ['kaaba', 'mecca', 'hajj', 'umrah', 'makkah'] },
  'ramadan-and-eid-gifts': { q: ['ramadan dates', 'ramadan lantern', 'eid'], need: ['ramadan', 'dates', 'eid', 'lantern', 'iftar'] },
  'black-seed': { q: ['black cumin seeds', 'nigella sativa', 'black seed oil'], need: ['black cumin', 'nigella', 'cumin', 'seed', 'oil'] },
  honey: { q: ['honey jar', 'honey dipper', 'honeycomb'], need: ['honey'] },
  'zamzam-and-khal': { q: ['water bottle', 'apple cider vinegar', 'glass water bottle'], need: ['water', 'vinegar', 'bottle', 'apple cider'] },
  'natural-oils-and-herbal': { q: ['olive oil bottle', 'herbal oil', 'dried herbs'], need: ['oil', 'herb', 'olive', 'leaves'] },
};


/** Per-product overrides (exact product name) used by `ONLY=1` to re-pick photos that did not fit. */
const OVR: Record<string, { q: string[]; need: string[] }> = {
  'Black Seed Honey': { q: ['honey jar', 'honey dipper'], need: ['honey'] },
  'Cold-Pressed Black Seed Oil': { q: ['essential oil dropper bottle', 'oil dropper', 'amber glass bottle'], need: ['dropper', 'essential oil', 'amber', 'bottle'] },
  'Kids Islamic Wristwatch': { q: ['wristwatch', 'watch'], need: ['watch', 'wristwatch'] },
  'Wooden Arabic Alphabet Blocks': { q: ['alphabet blocks', 'wooden blocks', 'abc blocks'], need: ['block', 'alphabet', 'abc'] },
  'Leather Crossbody Bag': { q: ['crossbody bag', 'leather handbag', 'shoulder bag'], need: ['handbag', 'bag', 'purse'] },
  'Everyday Tote Bag': { q: ['tote bag', 'canvas bag'], need: ['tote', 'bag'] },
  'Men Leather Bifold Wallet': { q: ['leather wallet', 'wallet'], need: ['wallet'] },
  'Crescent Hijab Pin Set': { q: ['gold brooch', 'brooch'], need: ['brooch'] },
  'Bridal Jewelry Set (Gold-Plated)': { q: ['jewelry set necklace earrings', 'gold necklace earrings', 'bridal jewelry'], need: ['necklace', 'earring', 'bridal'] },
  'Gold-Plated Band Ring': { q: ['gold wedding band', 'gold ring'], need: ['ring', 'band'] },
  'Minimal Stone Ring': { q: ['diamond ring', 'silver ring gemstone'], need: ['ring'] },
  '21K Solid Gold Bangle': { q: ['gold bangle', 'gold bracelet bangle'], need: ['bangle', 'bracelet'] },
  'Gold Drop Earrings': { q: ['gold earrings', 'drop earrings'], need: ['earring'] },
  'Beaded Charm Bracelet': { q: ['bead bracelet', 'beaded bracelet'], need: ['bracelet'] },
  'Sandalwood Tasbih 33 Beads': { q: ['tasbih', 'misbaha', 'islamic prayer beads'], need: ['tasbih', 'misbaha', 'prayer beads'] },
  'Crystal Tasbih 99 Beads': { q: ['misbaha', 'tasbih', 'gemstone beads'], need: ['misbaha', 'tasbih', 'beads'] },
  'Foldable Travel Prayer Mat': { q: ['muslim prayer', 'muslim praying mat'], need: ['prayer', 'pray', 'mat', 'rug'] },
  'Eid Mubarak Gift Box': { q: ['eid mubarak', 'ramadan gift'], need: ['eid', 'mubarak', 'ramadan'] },
  'Embroidered Kaftan': { q: ['arab man traditional dress', 'emirati man'], need: ['arab', 'thobe', 'emirati', 'traditional'] },
  'Boys Embroidered Eid Jubba': { q: ['muslim boy eid', 'arab boy'], need: ['boy', 'child', 'kid'] },
  'Thobe, Cap and Trouser Set': { q: ['arab man white', 'muslim man thobe'], need: ['thobe', 'arab', 'muslim', 'emirati'] },
  'Winter Wool-Blend Thobe': { q: ['arab man', 'saudi man thobe'], need: ['thobe', 'arab', 'saudi', 'emirati'] },
  'Olive and Habba Herbal Oil Blend': { q: ['olive oil', 'olive oil bottle'], need: ['olive'] },
  'Dried Sidr Leaf Powder': { q: ['dried herbs powder', 'herbal powder', 'spice powder'], need: ['powder', 'herb', 'spice'] },
  'Natural Apple Cider Khal': { q: ['apple cider vinegar', 'vinegar'], need: ['vinegar', 'apple cider'] },
  'Premium Bakhoor Chips': { q: ['incense', 'agarwood', 'oud wood'], need: ['incense', 'agarwood', 'bakhoor', 'oud'] },
  'Travel Prayer Dress with Pouch': { q: ['muslim woman praying', 'muslim woman prayer'], need: ['pray', 'prayer'] },
  'Girls Prayer Dress with Hijab': { q: ['muslim girl', 'little girl hijab'], need: ['girl', 'child', 'kid'] },
  'Girls Mini Abaya': { q: ['little girl hijab', 'muslim girl child'], need: ['girl', 'child', 'kid'] },
  'My First Book of Salah': { q: ['child praying', 'muslim child praying'], need: ['child', 'kid', 'boy', 'girl'] },
  'Raising Confident Muslim Children': { q: ['muslim family children', 'muslim father son'], need: ['family', 'child', 'father', 'mother'] },
  'Mother and Daughter Matching Abaya Set': { q: ['mother daughter hijab', 'muslim mother daughter'], need: ['mother', 'daughter'] },
  'Arabesque Wall Art Panel': { q: ['arabic calligraphy', 'islamic calligraphy'], need: ['calligraphy'] },
  'Carved Wooden Quran Stand': { q: ['quran stand', 'rehal quran', 'wooden book stand'], need: ['quran', 'stand', 'wooden'] },
};


/** Products where no relevant free photo was found: they keep their illustration rather than show a wrong picture. */
const SKIP = new Set([
  'Crescent Hijab Pin Set', 'Eid Mubarak Gift Box', 'Foldable Travel Prayer Mat', 'Embroidered Kaftan', 'Leather Crossbody Bag', 'Mother and Daughter Matching Abaya Set',
  'My First Book of Salah', 'Natural Apple Cider Khal', 'Sandalwood Tasbih 33 Beads', 'Thobe, Cap and Trouser Set', 'Gold Drop Earrings', 'Crystal Tasbih 99 Beads', 'Girls Prayer Dress with Hijab',
]);

const pool = new Map<string, { id: number; url: string }[]>();
async function search(q: string, need: string[]) {
  const key = q + need.join();
  if (pool.has(key)) return pool.get(key)!;
  const r = await fetch(`https://pixabay.com/api/?key=${KEY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=vertical&per_page=40&safesearch=true&order=popular`);
  const j: any = await r.json().catch(() => ({}));
  let hits: any[] = j.hits ?? [];
  if (hits.length < 3) {
    // try without orientation restriction
    const r2 = await fetch(`https://pixabay.com/api/?key=${KEY}&q=${encodeURIComponent(q)}&image_type=photo&per_page=40&safesearch=true`);
    hits = ((await r2.json().catch(() => ({}))) as any).hits ?? [];
  }
  const good = hits
    .filter((h) => {
      const tags = String(h.tags).toLowerCase();
      return need.some((n) => tags.includes(n)) && !BAN.some((b) => tags.includes(b)) && h.imageWidth >= 640;
    })
    .map((h) => ({ id: h.id as number, url: h.webformatURL as string }));
  pool.set(key, good);
  await new Promise((r) => setTimeout(r, 700)); // stay far below Pixabay's 100 req/min limit
  return good;
}

async function download(id: number, url: string) {
  const file = `pxb-${id}.jpg`;
  const path = join(OUT, file);
  if (!existsSync(path)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('download failed ' + url);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return '/products/photos/' + file;
}

async function main() {
  const ONLY = process.env.ONLY === '1';
  const all = await prisma.product.findMany({ include: { category: true, images: true }, orderBy: { name: 'asc' } });
  const products = ONLY ? all.filter((p) => OVR[p.name]) : all;
  const used = new Set<number>(); // never reuse the same photo for two products
  if (ONLY) for (const p of all) if (!OVR[p.name]) for (const i of p.images) { const m = /pxb-(\d+)/.exec(i.url); if (m) used.add(Number(m[1])); }
  let swapped = 0;
  const kept: string[] = [];
  for (const p of products) {
    if (SKIP.has(p.name)) { kept.push(p.name); continue; }
    const m = (ONLY ? OVR[p.name] : OVR[p.name] ?? MAP[p.category.slug]);
    if (!m) { kept.push(p.name); continue; }
    const candidates: { id: number; url: string }[] = [];
    for (const q of m.q) for (const c of await search(q, m.need)) if (!used.has(c.id) && !candidates.some((x) => x.id === c.id)) candidates.push(c);
    const picks = candidates.slice(0, 2);
    if (!picks.length) { kept.push(p.name); continue; }
    picks.forEach((c) => used.add(c.id));
    const urls = [];
    for (const c of picks) urls.push(await download(c.id, c.url));
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: p.id } }),
      prisma.productImage.createMany({ data: urls.map((url, i) => ({ productId: p.id, url, alt: p.name + (i ? ' - view ' + (i + 1) : ''), sortOrder: i })) }),
    ]);
    swapped++;
    console.log('photo', p.category.slug.padEnd(26), p.name);
  }
  console.log(`\nPhotos applied to ${swapped}/${products.length} products. Kept illustration for ${kept.length}: ${kept.join('; ')}`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
