import 'dotenv/config';
import { Audience, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { COLORS, svg } from './art';

const prisma = new PrismaClient();
const OUT = join(__dirname, '..', '..', 'web', 'public', 'products');
mkdirSync(OUT, { recursive: true });

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const naira = (n: number) => n * 100;

// ------------------------------------------------------------------ categories
const TREE: Record<string, { ar: string; img: string; kids: [string, string][] }> = {
  Women: { ar: 'نساء', img: 'abaya-black-1', kids: [['Abayas', 'عبايات'], ['Prayer Dresses', 'فساتين الصلاة'], ['Jilbabs & Khimars', 'جلباب وخمار'], ['Hijabs', 'حجاب'], ['Hijab Caps & Undercaps', 'طواقي الحجاب'], ['Niqabs', 'نقاب'], ['Modest Dresses', 'فساتين محتشمة']] },
  Men: { ar: 'رجال', img: 'thobe-white-1', kids: [['Thobes & Jubbas', 'ثياب وجبب'], ['Kaftans', 'قفطان'], ['Islamic Clothing Sets', 'أطقم إسلامية']] },
  Kids: { ar: 'أطفال', img: 'thobe-sand-1-k', kids: [['Boys Thobes & Clothing', 'ثياب الأولاد'], ['Boys Prayer Outfits', 'ملابس صلاة للأولاد'], ['Girls Abayas & Hijabs', 'عبايات وحجاب البنات'], ['Girls Modest Dresses', 'فساتين البنات'], ['Matching Family Sets', 'أطقم عائلية'], ['Kids Accessories & Toys', 'إكسسوارات وألعاب']] },
  Accessories: { ar: 'إكسسوارات', img: 'bag-camel-1', kids: [['Watches', 'ساعات'], ['Handbags & Wallets', 'حقائب ومحافظ'], ['Hijab Pins & Brooches', 'دبابيس وبروش'], ['Prayer Beads (Tasbih)', 'سبحة'], ['Rings & Bracelets', 'خواتم وأساور']] },
  'Gold & Jewelry': { ar: 'ذهب ومجوهرات', img: 'necklace-emerald-1-gold', kids: [['Gold Necklaces', 'قلائد ذهبية'], ['Gold Bracelets', 'أساور ذهبية'], ['Gold Rings', 'خواتم ذهبية'], ['Earrings', 'أقراط'], ['Jewelry Sets', 'أطقم مجوهرات']] },
  Perfumes: { ar: 'عطور', img: 'perfume-burgundy-1', kids: [['Oud Perfumes', 'عطور العود'], ['Attars & Perfume Oils', 'عطور زيتية'], ['Bakhoor & Incense', 'بخور'], ['Musk', 'مسك'], ['Perfume Gift Sets', 'أطقم هدايا العطور']] },
  'Islamic Books': { ar: 'كتب إسلامية', img: 'book-emerald-1-the-noble-quran', kids: [['Quran & Tafsir', 'قرآن وتفسير'], ['Hadith', 'حديث'], ['Seerah & History', 'سيرة وتاريخ'], ['Aqeedah & Fiqh', 'عقيدة وفقه'], ['Books for Muslim Women', 'كتب للمرأة المسلمة'], ['Kids Islamic Books', 'كتب إسلامية للأطفال'], ['Arabic Learning', 'تعلم العربية'], ['Journals & Planners', 'مفكرات ويوميات'], ['Parenting', 'تربية']] },
  'Arabian Products': { ar: 'منتجات عربية', img: 'mat-emerald-1', kids: [['Prayer Mats', 'سجادات الصلاة'], ['Quran Stands', 'حوامل المصحف'], ['Wall Decor', 'ديكور الجدران'], ['Gift Boxes', 'صناديق الهدايا'], ['Hajj & Umrah Essentials', 'مستلزمات الحج والعمرة'], ['Ramadan & Eid Gifts', 'هدايا رمضان والعيد']] },
  'Prophetic Medicine': { ar: 'الطب النبوي', img: 'blackseed-brown-1', kids: [['Black Seed', 'حبة البركة'], ['Honey', 'عسل'], ['Zamzam & Khal', 'زمزم وخل'], ['Natural Oils & Herbal', 'زيوت وأعشاب']] },
};

// -------------------------------------------------------------------- products
interface Spec {
  name: string; nameAr?: string; cat: string; aud: Audience; price: number; sale?: number; art: string; colors: string[]; sizes?: string[];
  brand: string; material: string; theme: string; desc: string; label?: string; kids?: boolean; metal?: 'gold' | 'silver';
  collection?: string; f?: boolean; n?: boolean; b?: boolean; attrs?: [string, string][]; stock?: number;
}
const ADULT = ['S', 'M', 'L', 'XL'];
const ABAYA_SIZES = ['52', '54', '56', '58'];
const KID_SIZES = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y'];
const NOTE_MED = ['Notice', 'Traditional wellness product. Not intended to diagnose, treat, cure or prevent any disease and not a substitute for professional medical advice.'] as [string, string];

const S: Spec[] = [
  // ---- Women
  { name: 'Classic Open Abaya', nameAr: 'عباية مفتوحة كلاسيكية', cat: 'Abayas', aud: 'WOMEN', price: 58000, art: 'abaya', colors: ['black', 'navy', 'taupe'], sizes: ABAYA_SIZES, brand: 'Modeza', material: 'Premium Nida crepe', theme: 'fashion', f: true, b: true, desc: 'A timeless open-front abaya in breathable Nida crepe with wide bell sleeves and gold-tone cuff detailing. Relaxed fit with a flowing drape.', attrs: [['Style', 'Open front'], ['Length', '56 inches (adjustable hem)'], ['Care', 'Hand wash cold, hang dry']] },
  { name: 'Closed Butterfly Abaya', nameAr: 'عباية فراشة مغلقة', cat: 'Abayas', aud: 'WOMEN', price: 72000, sale: 61000, art: 'jilbab', colors: ['burgundy', 'emerald', 'black'], sizes: ABAYA_SIZES, brand: 'Modeza', material: 'Chiffon-lined Korean crepe', theme: 'fashion', n: true, desc: 'A closed butterfly-cut abaya with generous sleeves and a soft cape overlay. Lightweight and elegant for daily and evening wear.', attrs: [['Style', 'Closed / butterfly'], ['Care', 'Dry clean recommended']] },
  { name: 'Embroidered Dubai Abaya', nameAr: 'عباية دبي مطرزة', cat: 'Abayas', aud: 'WOMEN', price: 118000, art: 'abaya', colors: ['olive', 'plum'], sizes: ABAYA_SIZES, brand: 'Layla Atelier', material: 'Silk-blend crepe with hand embroidery', theme: 'fashion', f: true, collection: 'Eid', desc: 'Hand-finished tonal embroidery along the sleeves and hem. A statement piece for Eid and special occasions.', attrs: [['Style', 'Open front'], ['Care', 'Dry clean only']] },
  { name: 'Everyday Linen Abaya', cat: 'Abayas', aud: 'WOMEN', price: 46000, art: 'abaya', colors: ['sand', 'white', 'camel'], sizes: ABAYA_SIZES, brand: 'Modeza', material: 'Linen-viscose blend', theme: 'fashion', n: true, desc: 'Breathable linen-viscose abaya designed for warm weather, with side pockets and a relaxed straight cut.', attrs: [['Pockets', 'Yes, side seam']] },
  { name: 'Two-Piece Prayer Dress', nameAr: 'فستان صلاة قطعتين', cat: 'Prayer Dresses', aud: 'WOMEN', price: 34000, art: 'dress', colors: ['rose', 'grey', 'emerald'], sizes: ['S/M', 'L/XL'], brand: 'Modeza', material: 'Soft cotton jersey', theme: 'fashion', b: true, desc: 'A practical two-piece prayer set with an attached hijab and a full-length skirt. Opaque, soft and easy to put on.', attrs: [['Pieces', 'Top + skirt'], ['Care', 'Machine wash 30 C']] },
  { name: 'Travel Prayer Dress with Pouch', cat: 'Prayer Dresses', aud: 'WOMEN', price: 29500, art: 'dress', colors: ['navy', 'black'], sizes: ['S/M', 'L/XL'], brand: 'Modeza', material: 'Wrinkle-free polyester crepe', theme: 'fashion', desc: 'Wrinkle-resistant one-piece prayer dress that folds into a small zip pouch for travel, Hajj and Umrah.', attrs: [['Includes', 'Travel pouch']] },
  { name: 'Hooded Jilbab', nameAr: 'جلباب بقلنسوة', cat: 'Jilbabs & Khimars', aud: 'WOMEN', price: 52000, art: 'jilbab', colors: ['black', 'olive', 'taupe'], sizes: ABAYA_SIZES, brand: 'Modeza', material: 'Heavy Nida', theme: 'fashion', desc: 'Full-length hooded jilbab with an elasticated wrist and a roomy cut that offers full coverage.', attrs: [['Coverage', 'Full length']] },
  { name: 'Long Layered Khimar', cat: 'Jilbabs & Khimars', aud: 'WOMEN', price: 21500, art: 'khimar', colors: ['black', 'burgundy', 'sand'], brand: 'Modeza', material: 'Double-layer chiffon', theme: 'fashion', desc: 'A two-layer chiffon khimar that falls to the waist with a comfortable pull-on design.', attrs: [['Length', '110 cm']] },
  { name: 'Premium Jersey Hijab', nameAr: 'حجاب جيرسي', cat: 'Hijabs', aud: 'WOMEN', price: 7500, art: 'hijab', colors: ['black', 'sand', 'rose', 'navy', 'olive'], brand: 'Modeza', material: 'Premium cotton jersey', theme: 'fashion', b: true, desc: 'Soft, stretchy jersey that stays in place without slipping. Pre-hemmed edges and a matte finish.', attrs: [['Size', '180 x 70 cm']] },
  { name: 'Chiffon Georgette Hijab', cat: 'Hijabs', aud: 'WOMEN', price: 6500, art: 'hijab', colors: ['white', 'rose', 'sky', 'emerald'], brand: 'Modeza', material: 'Georgette chiffon', theme: 'fashion', n: true, desc: 'Lightweight georgette with a graceful drape. Easy to style in layers.', attrs: [['Size', '180 x 75 cm']] },
  { name: 'Satin Silk Hijab', cat: 'Hijabs', aud: 'WOMEN', price: 12500, sale: 9900, art: 'hijab', colors: ['burgundy', 'gold', 'plum'], brand: 'Layla Atelier', material: 'Satin silk', theme: 'fashion', desc: 'A luxurious satin silk scarf with a subtle sheen for occasions.', attrs: [['Size', '180 x 70 cm']] },
  { name: 'Ninja Undercap Set (3 pack)', cat: 'Hijab Caps & Undercaps', aud: 'WOMEN', price: 5500, art: 'cap', colors: ['black', 'white', 'sand'], brand: 'Modeza', material: 'Stretch cotton', theme: 'fashion', desc: 'Breathable stretch undercaps that keep your hijab secure all day.', attrs: [['Pack', '3 caps']] },
  { name: 'Two-Layer Niqab', cat: 'Niqabs', aud: 'WOMEN', price: 8500, art: 'niqab', colors: ['black', 'navy'], brand: 'Modeza', material: 'Breathable chiffon', theme: 'fashion', desc: 'Adjustable two-layer niqab with a comfortable headband and secure tie.', attrs: [['Fit', 'Adjustable']] },
  { name: 'Pleated Maxi Modest Dress', cat: 'Modest Dresses', aud: 'WOMEN', price: 49000, art: 'dress', colors: ['sand', 'emerald', 'rose'], sizes: ADULT, brand: 'Layla Atelier', material: 'Pleated crepe', theme: 'fashion', f: true, n: true, desc: 'A flattering maxi dress with a belted waist and full-length sleeves. Opaque lining for confident coverage.', attrs: [['Lining', 'Fully lined']] },
  { name: 'Silk-Touch Evening Dress', cat: 'Modest Dresses', aud: 'WOMEN', price: 85000, sale: 69000, art: 'dress', colors: ['plum', 'black'], sizes: ADULT, brand: 'Layla Atelier', material: 'Silk-touch satin', theme: 'fashion', collection: 'Eid', desc: 'An evening dress with soft satin movement and a modest high neckline.', attrs: [['Occasion', 'Evening / Eid']] },

  // ---- Men
  { name: 'Signature Saudi Thobe', nameAr: 'ثوب سعودي', cat: 'Thobes & Jubbas', aud: 'MEN', price: 64000, art: 'thobe', colors: ['white', 'cream', 'grey'], sizes: ['52', '54', '56', '58'], brand: 'Modeza', material: 'Premium Japanese polyester-viscose', theme: 'men', f: true, b: true, desc: 'A crisp, wrinkle-resistant thobe with a mandarin collar, concealed placket and a front pocket.', attrs: [['Collar', 'Mandarin'], ['Care', 'Machine wash 30 C']] },
  { name: 'Moroccan Jubba', cat: 'Thobes & Jubbas', aud: 'MEN', price: 48000, art: 'thobe', colors: ['navy', 'olive', 'sand'], sizes: ADULT, brand: 'Modeza', material: 'Cotton blend', theme: 'men', n: true, desc: 'A relaxed Moroccan-style jubba with a subtle embroidered placket.', attrs: [['Fit', 'Relaxed']] },
  { name: 'Winter Wool-Blend Thobe', cat: 'Thobes & Jubbas', aud: 'MEN', price: 92000, art: 'thobe', colors: ['grey', 'brown'], sizes: ['52', '54', '56', '58'], brand: 'Modeza', material: 'Wool-blend', theme: 'men', desc: 'A warm wool-blend thobe for cooler months.', attrs: [['Season', 'Winter']] },
  { name: 'Embroidered Kaftan', cat: 'Kaftans', aud: 'MEN', price: 56000, sale: 47500, art: 'kaftan', colors: ['black', 'emerald', 'sand'], sizes: ADULT, brand: 'Modeza', material: 'Cotton-linen blend', theme: 'men', n: true, desc: 'A wide-sleeved kaftan with gold-tone embroidery on the front placket.', attrs: [['Style', 'Wide sleeve']] },
  { name: 'Thobe, Cap and Trouser Set', cat: 'Islamic Clothing Sets', aud: 'MEN', price: 72000, art: 'thobe', colors: ['white', 'taupe'], sizes: ADULT, brand: 'Modeza', material: 'Cotton', theme: 'men', desc: 'A complete three-piece set: knee-length kurta, matching cap and straight trousers.', attrs: [['Pieces', '3']] },

  // ---- Kids
  { name: 'Boys Everyday Thobe', cat: 'Boys Thobes & Clothing', aud: 'BOYS', price: 19500, art: 'thobe', colors: ['white', 'navy', 'sand'], sizes: KID_SIZES, brand: 'Modeza Kids', material: 'Soft cotton blend', theme: 'kids', kids: true, f: true, b: true, desc: 'A comfortable thobe for little boys with a soft collar and easy buttons.', attrs: [['Age range', '2 - 11 years']] },
  { name: 'Boys Embroidered Eid Jubba', cat: 'Boys Thobes & Clothing', aud: 'BOYS', price: 26000, art: 'kaftan', colors: ['burgundy', 'emerald'], sizes: KID_SIZES, brand: 'Modeza Kids', material: 'Cotton-silk blend', theme: 'kids', kids: true, n: true, collection: 'Eid', desc: 'A festive jubba with golden placket embroidery.', attrs: [['Age range', '2 - 11 years']] },
  { name: 'Boys Prayer Outfit Set', cat: 'Boys Prayer Outfits', aud: 'BOYS', price: 23000, art: 'thobe', colors: ['grey', 'white'], sizes: KID_SIZES, brand: 'Modeza Kids', material: 'Cotton', theme: 'kids', kids: true, desc: 'A matching thobe, cap and trouser prayer outfit.', attrs: [['Pieces', '3']] },
  { name: 'Girls Mini Abaya', cat: 'Girls Abayas & Hijabs', aud: 'GIRLS', price: 24500, art: 'abaya', colors: ['black', 'rose', 'sky'], sizes: KID_SIZES, brand: 'Modeza Kids', material: 'Soft crepe', theme: 'kids', kids: true, f: true, n: true, desc: 'A mini open abaya with soft sleeves and a tie belt, sized for comfort.', attrs: [['Age range', '2 - 11 years']] },
  { name: 'Girls Easy Slip-On Hijab', cat: 'Girls Abayas & Hijabs', aud: 'GIRLS', price: 5000, art: 'hijab', colors: ['rose', 'white', 'navy', 'sky'], sizes: ['S (3-6Y)', 'M (7-10Y)'], brand: 'Modeza Kids', material: 'Cotton jersey', theme: 'kids', kids: true, b: true, desc: 'A pull-on hijab that stays put during play.', attrs: [['Style', 'Pull-on']] },
  { name: 'Girls Prayer Dress with Hijab', cat: 'Girls Modest Dresses', aud: 'GIRLS', price: 22000, art: 'dress', colors: ['rose', 'emerald'], sizes: KID_SIZES, brand: 'Modeza Kids', material: 'Soft cotton', theme: 'kids', kids: true, desc: 'A one-piece prayer dress with an attached hijab for young girls.', attrs: [['Age range', '2 - 11 years']] },
  { name: 'Mother and Daughter Matching Abaya Set', cat: 'Matching Family Sets', aud: 'GIRLS', price: 78000, sale: 69500, art: 'abaya', colors: ['sand', 'burgundy'], sizes: ['Mum M + Girl 4-5Y', 'Mum L + Girl 6-7Y'], brand: 'Modeza', material: 'Crepe', theme: 'kids', kids: true, f: true, collection: 'Eid', desc: 'Matching open abayas for mother and daughter, with identical trim.', attrs: [['Set', '2 abayas']] },
  { name: 'Father and Son Matching Thobe Set', cat: 'Matching Family Sets', aud: 'BOYS', price: 82000, art: 'thobe', colors: ['white', 'cream'], sizes: ['Dad 54 + Boy 4-5Y', 'Dad 56 + Boy 6-7Y'], brand: 'Modeza', material: 'Cotton blend', theme: 'kids', kids: true, n: true, desc: 'Matching thobes for father and son.', attrs: [['Set', '2 thobes']] },
  { name: 'Wooden Arabic Alphabet Blocks', cat: 'Kids Accessories & Toys', aud: 'KIDS', price: 14500, art: 'toy', colors: ['emerald', 'terracotta'], brand: 'Little Believers', material: 'Beech wood, non-toxic paint', theme: 'kids', desc: 'Stackable blocks that make learning Arabic letters a game. Recommended age 3+.', attrs: [['Age', '3+'], ['Safety', 'Non-toxic paint']] },
  { name: 'Kids Islamic Wristwatch', cat: 'Kids Accessories & Toys', aud: 'KIDS', price: 12500, art: 'watch', colors: ['navy', 'rose'], brand: 'Little Believers', material: 'Stainless steel case, silicone strap', theme: 'kids', desc: 'A durable children watch with a dial that shows prayer-time reminders as a printed guide.', attrs: [['Water resistance', '3 ATM']] },

  // ---- Accessories
  { name: 'Islamic Qibla Compass Watch', cat: 'Watches', aud: 'UNISEX', price: 78000, art: 'watch', colors: ['black', 'navy'], brand: 'Al Nur', material: 'Stainless steel, mineral glass', theme: 'men', f: true, desc: 'Analogue watch with a classic gold-tone bezel and a Qibla compass hand.', attrs: [['Movement', 'Quartz'], ['Water resistance', '5 ATM']] },
  { name: 'Women Rose Gold Dress Watch', cat: 'Watches', aud: 'WOMEN', price: 54000, sale: 45000, art: 'watch', colors: ['rose', 'cream'], brand: 'Al Nur', material: 'Stainless steel with PVD coating', theme: 'jewel', n: true, desc: 'A refined dress watch with a slim case and a soft leather strap.', attrs: [['Movement', 'Quartz']] },
  { name: 'Leather Crossbody Bag', cat: 'Handbags & Wallets', aud: 'WOMEN', price: 68000, art: 'bag', colors: ['camel', 'black', 'burgundy'], brand: 'Layla Atelier', material: 'Genuine leather', theme: 'fashion', b: true, desc: 'Structured crossbody with an adjustable strap and a magnetic clasp.', attrs: [['Dimensions', '24 x 17 x 8 cm']] },
  { name: 'Everyday Tote Bag', cat: 'Handbags & Wallets', aud: 'WOMEN', price: 52000, art: 'bag', colors: ['taupe', 'olive', 'navy'], brand: 'Layla Atelier', material: 'Vegan leather', theme: 'fashion', desc: 'A roomy tote that fits a prayer mat, a book and your essentials.', attrs: [['Dimensions', '36 x 30 x 12 cm']] },
  { name: 'Men Leather Bifold Wallet', cat: 'Handbags & Wallets', aud: 'MEN', price: 24000, art: 'wallet', colors: ['brown', 'black'], brand: 'Al Nur', material: 'Full-grain leather', theme: 'men', desc: 'Slim bifold wallet with six card slots and a coin pocket.', attrs: [['Card slots', '6']] },
  { name: 'Crescent Hijab Pin Set', cat: 'Hijab Pins & Brooches', aud: 'WOMEN', price: 6500, art: 'pin', colors: ['emerald', 'rose'], brand: 'Modeza', material: 'Gold-tone alloy (not solid gold)', theme: 'jewel', metal: 'gold', desc: 'A set of crescent-and-star hijab pins in a gold-tone finish.', attrs: [['Finish', 'Gold-tone'], ['Pack', '3 pins']] },
  { name: 'Pearl Brooch', cat: 'Hijab Pins & Brooches', aud: 'WOMEN', price: 9500, art: 'pin', colors: ['cream', 'sky'], brand: 'Modeza', material: 'Gold-plated brass, glass pearl', theme: 'jewel', metal: 'gold', desc: 'An elegant brooch for securing hijabs and shawls.', attrs: [['Finish', 'Gold-plated']] },
  { name: 'Sandalwood Tasbih 33 Beads', cat: 'Prayer Beads (Tasbih)', aud: 'UNISEX', price: 6000, art: 'tasbih', colors: ['brown', 'camel'], brand: 'Al Nur', material: 'Natural sandalwood', theme: 'home', b: true, desc: 'Hand-polished 33-bead tasbih with a gold-tone spacer and tassel.', attrs: [['Beads', '33']] },
  { name: 'Crystal Tasbih 99 Beads', cat: 'Prayer Beads (Tasbih)', aud: 'UNISEX', price: 15500, art: 'tasbih', colors: ['sky', 'emerald', 'rose'], brand: 'Al Nur', material: 'Crystal-glass beads', theme: 'home', n: true, desc: 'A 99-bead tasbih with crystal-glass beads and a silky tassel.', attrs: [['Beads', '99']] },
  { name: 'Beaded Charm Bracelet', cat: 'Rings & Bracelets', aud: 'WOMEN', price: 14000, art: 'bracelet', colors: ['emerald', 'rose'], brand: 'Modeza', material: 'Gold-plated brass, natural stone beads', theme: 'jewel', metal: 'gold', desc: 'A delicate bracelet with a centre stone and small bead accents.', attrs: [['Finish', 'Gold-plated']] },
  { name: 'Minimal Stone Ring', cat: 'Rings & Bracelets', aud: 'WOMEN', price: 11500, art: 'ring', colors: ['sky', 'rose'], brand: 'Modeza', material: 'Sterling silver (925), cubic zirconia', theme: 'jewel', metal: 'silver', desc: 'A simple stone ring in 925 sterling silver.', attrs: [['Metal', '925 sterling silver']] },

  // ---- Gold & jewelry
  { name: '18K Solid Gold Crescent Necklace', cat: 'Gold Necklaces', aud: 'WOMEN', price: 485000, art: 'necklace', colors: ['emerald'], brand: 'Dar Al Dhahab', material: '18K solid gold (750), 4.2 g', theme: 'jewel', metal: 'gold', f: true, desc: 'A solid 18K gold crescent pendant on a fine cable chain, with an emerald-green stone detail.', attrs: [['Metal type', 'Solid gold'], ['Purity', '18K / 750'], ['Weight', 'approx. 4.2 g'], ['Certificate', 'Hallmarked']] },
  { name: 'Gold-Plated Layered Necklace', cat: 'Gold Necklaces', aud: 'WOMEN', price: 32000, sale: 26500, art: 'necklace', colors: ['sky', 'rose'], brand: 'Modeza', material: '18K gold-plated stainless steel', theme: 'jewel', metal: 'gold', n: true, desc: 'A gold-plated pendant necklace, plated over stainless steel for everyday wear.', attrs: [['Metal type', 'Gold-plated (not solid)'], ['Base metal', 'Stainless steel'], ['Plating', '18K']] },
  { name: '21K Solid Gold Bangle', cat: 'Gold Bracelets', aud: 'WOMEN', price: 890000, art: 'bracelet', colors: ['rose'], brand: 'Dar Al Dhahab', material: '21K solid gold (875), 9.5 g', theme: 'jewel', metal: 'gold', desc: 'A hand-finished bangle in solid 21K gold.', attrs: [['Metal type', 'Solid gold'], ['Purity', '21K / 875'], ['Weight', 'approx. 9.5 g']] },
  { name: 'Gold-Tone Chain Bracelet', cat: 'Gold Bracelets', aud: 'WOMEN', price: 18500, art: 'bracelet', colors: ['cream'], brand: 'Modeza', material: 'Gold-tone zinc alloy', theme: 'jewel', metal: 'gold', desc: 'A fashion bracelet with a gold-tone finish. Not solid gold.', attrs: [['Metal type', 'Gold-tone (fashion jewelry)']] },
  { name: '18K Solid Gold Solitaire Ring', cat: 'Gold Rings', aud: 'WOMEN', price: 320000, art: 'ring', colors: ['sky'], sizes: ['6', '7', '8', '9'], brand: 'Dar Al Dhahab', material: '18K solid gold (750), cubic zirconia', theme: 'jewel', metal: 'gold', b: true, desc: 'A classic solitaire ring in 18K solid gold.', attrs: [['Metal type', 'Solid gold'], ['Purity', '18K / 750']] },
  { name: 'Gold-Plated Band Ring', cat: 'Gold Rings', aud: 'UNISEX', price: 14500, art: 'ring', colors: ['cream'], sizes: ['6', '7', '8', '9'], brand: 'Modeza', material: 'Gold-plated sterling silver', theme: 'jewel', metal: 'gold', desc: 'A simple band in 18K gold plating over sterling silver.', attrs: [['Metal type', 'Gold-plated (not solid)'], ['Base metal', '925 silver']] },
  { name: 'Gold Drop Earrings', cat: 'Earrings', aud: 'WOMEN', price: 245000, art: 'earrings', colors: ['emerald'], brand: 'Dar Al Dhahab', material: '18K solid gold (750), 3.1 g', theme: 'jewel', metal: 'gold', n: true, desc: 'Elegant drop earrings in solid 18K gold.', attrs: [['Metal type', 'Solid gold'], ['Purity', '18K / 750']] },
  { name: 'Pearl-Look Statement Earrings', cat: 'Earrings', aud: 'WOMEN', price: 9000, art: 'earrings', colors: ['cream', 'rose'], brand: 'Modeza', material: 'Gold-tone alloy, acrylic pearl', theme: 'jewel', metal: 'gold', desc: 'Lightweight statement earrings with a gold-tone finish.', attrs: [['Metal type', 'Gold-tone (fashion jewelry)']] },
  { name: 'Bridal Jewelry Set (Gold-Plated)', cat: 'Jewelry Sets', aud: 'WOMEN', price: 78000, art: 'jewelset', colors: ['burgundy', 'emerald'], brand: 'Modeza', material: '18K gold-plated brass, crystals', theme: 'jewel', metal: 'gold', f: true, collection: 'Eid', desc: 'A necklace and earring set, plated in 18K gold.', attrs: [['Metal type', 'Gold-plated (not solid)'], ['Includes', 'Necklace + earrings']] },

  // ---- Perfumes
  { name: 'Royal Oud Eau de Parfum', nameAr: 'عود ملكي', cat: 'Oud Perfumes', aud: 'UNISEX', price: 95000, art: 'perfume', colors: ['burgundy', 'black'], brand: 'Dar Al Oud', material: 'Glass bottle', theme: 'scent', f: true, b: true, desc: 'A deep, woody oud with warm amber and a touch of rose.', attrs: [['Volume', '100 ml'], ['Concentration', 'Eau de Parfum'], ['Top notes', 'Saffron, bergamot'], ['Heart notes', 'Oud, rose'], ['Base notes', 'Amber, sandalwood']] },
  { name: 'Cambodi Oud Reserve', cat: 'Oud Perfumes', aud: 'UNISEX', price: 185000, art: 'perfume', colors: ['brown'], brand: 'Dar Al Oud', material: 'Glass bottle', theme: 'scent', n: true, desc: 'A rich Cambodian oud blended with leather and resins.', attrs: [['Volume', '50 ml'], ['Concentration', 'Parfum'], ['Top notes', 'Cardamom'], ['Heart notes', 'Cambodian oud'], ['Base notes', 'Leather, labdanum']] },
  { name: 'White Musk Attar', cat: 'Attars & Perfume Oils', aud: 'UNISEX', price: 14500, art: 'attar', colors: ['cream', 'sky'], brand: 'Al Nur', material: 'Alcohol-free perfume oil', theme: 'scent', b: true, desc: 'A clean, soft musk in a concentrated alcohol-free oil with a roll-on applicator.', attrs: [['Volume', '12 ml'], ['Concentration', 'Attar (alcohol-free)'], ['Notes', 'White musk, jasmine']] },
  { name: 'Rose and Oud Attar', cat: 'Attars & Perfume Oils', aud: 'WOMEN', price: 22500, art: 'attar', colors: ['rose'], brand: 'Dar Al Oud', material: 'Alcohol-free perfume oil', theme: 'scent', desc: 'A romantic blend of Taif rose and mellow oud.', attrs: [['Volume', '12 ml'], ['Concentration', 'Attar (alcohol-free)'], ['Notes', 'Rose, oud']] },
  { name: 'Premium Bakhoor Chips', cat: 'Bakhoor & Incense', aud: 'UNISEX', price: 12000, art: 'bakhoor', colors: ['brown'], brand: 'Dar Al Oud', material: 'Agarwood chips, resins and essential oils', theme: 'scent', desc: 'Fragrant bakhoor chips for burning on charcoal. Use only with a proper burner and never leave unattended.', attrs: [['Weight', '50 g'], ['Safety', 'Use with charcoal burner, keep away from children']] },
  { name: 'Ornate Mabkhara Incense Burner', cat: 'Bakhoor & Incense', aud: 'UNISEX', price: 28000, art: 'bakhoor', colors: ['emerald', 'burgundy'], brand: 'Al Nur', material: 'Brass and enamel', theme: 'scent', n: true, desc: 'A decorative incense burner finished in gold-tone brass.', attrs: [['Height', '16 cm']] },
  { name: 'Egyptian Musk Roll-On', cat: 'Musk', aud: 'UNISEX', price: 8500, art: 'attar', colors: ['white'], brand: 'Al Nur', material: 'Alcohol-free perfume oil', theme: 'scent', desc: 'A light powdery musk.', attrs: [['Volume', '6 ml']] },
  { name: 'Signature Perfume Gift Set', cat: 'Perfume Gift Sets', aud: 'UNISEX', price: 125000, sale: 105000, art: 'giftbox', colors: ['burgundy', 'emerald'], brand: 'Dar Al Oud', material: 'Gift box', theme: 'scent', f: true, collection: 'Ramadan', desc: 'A gift set with an eau de parfum, an attar and a bakhoor sample in a presentation box.', attrs: [['Contents', 'EDP 50 ml, attar 12 ml, bakhoor 10 g']] },

  // ---- Books
  { name: 'The Noble Quran (English Translation)', cat: 'Quran & Tafsir', aud: 'UNISEX', price: 18500, art: 'book', colors: ['emerald', 'black'], label: 'The Noble Quran', brand: 'Darussalam', material: 'Hardcover', theme: 'books', b: true, desc: 'Arabic text with a parallel English translation, in a durable hardcover edition.', attrs: [['Author', 'Translation by Dr. Muhammad Taqi-ud-Din Al-Hilali and Dr. Muhammad Muhsin Khan'], ['Publisher', 'Darussalam'], ['Language', 'Arabic / English'], ['Format', 'Hardcover']] },
  { name: 'Tafsir Ibn Kathir (Abridged)', cat: 'Quran & Tafsir', aud: 'UNISEX', price: 96000, art: 'book', colors: ['burgundy'], label: 'Tafsir Ibn Kathir', brand: 'Darussalam', material: 'Hardcover set', theme: 'books', desc: 'The abridged English edition of the classical tafsir.', attrs: [['Author', 'Ibn Kathir'], ['Publisher', 'Darussalam'], ['Language', 'English'], ['Format', 'Hardcover, multi-volume']] },
  { name: 'Riyad as-Salihin', cat: 'Hadith', aud: 'UNISEX', price: 15500, art: 'book', colors: ['emerald'], label: 'Riyad as-Salihin', brand: 'Darussalam', material: 'Hardcover', theme: 'books', n: true, desc: 'A well-known collection of hadith arranged by themes of character and worship.', attrs: [['Author', 'Imam an-Nawawi'], ['Publisher', 'Darussalam'], ['Language', 'English'], ['Format', 'Hardcover']] },
  { name: 'The Sealed Nectar', cat: 'Seerah & History', aud: 'UNISEX', price: 9500, art: 'book', colors: ['navy'], label: 'The Sealed Nectar', brand: 'Darussalam', material: 'Paperback', theme: 'books', b: true, desc: 'A prize-winning biography of the Prophet Muhammad (peace be upon him).', attrs: [['Author', 'Safiur-Rahman al-Mubarakpuri'], ['Publisher', 'Darussalam'], ['Language', 'English'], ['Format', 'Paperback']] },
  { name: 'Stories of the Prophets', cat: 'Seerah & History', aud: 'UNISEX', price: 14000, art: 'book', colors: ['olive'], label: 'Stories of the Prophets', brand: 'Darussalam', material: 'Hardcover', theme: 'books', desc: 'Accounts of the prophets drawn from the Quran and authentic narrations.', attrs: [['Author', 'Ibn Kathir'], ['Publisher', 'Darussalam'], ['Language', 'English'], ['Format', 'Hardcover']] },
  { name: 'Fortress of the Muslim', cat: 'Aqeedah & Fiqh', aud: 'UNISEX', price: 4500, art: 'book', colors: ['sand', 'black'], label: 'Fortress of the Muslim', brand: 'Darussalam', material: 'Pocket paperback', theme: 'books', b: true, desc: 'A pocket collection of daily supplications from the Quran and Sunnah.', attrs: [['Author', 'Sa\'id bin Ali bin Wahf al-Qahtani'], ['Language', 'Arabic / English'], ['Format', 'Pocket paperback']] },
  { name: 'Forty Hadith of Imam an-Nawawi', cat: 'Aqeedah & Fiqh', aud: 'UNISEX', price: 3500, art: 'book', colors: ['burgundy'], label: 'Forty Hadith', brand: 'Darussalam', material: 'Paperback', theme: 'books', desc: 'The classic forty hadith that summarise core principles of the religion, with commentary.', attrs: [['Author', 'Imam an-Nawawi'], ['Language', 'English'], ['Format', 'Paperback']] },
  { name: 'Guidance for the Muslim Woman', cat: 'Books for Muslim Women', aud: 'WOMEN', price: 8500, art: 'book', colors: ['plum', 'rose'], label: 'Guidance for Her', brand: 'Modeza Press', material: 'Paperback', theme: 'books', n: true, desc: 'A practical, encouraging guide to faith, family and everyday life.', attrs: [['Publisher', 'Modeza Press'], ['Language', 'English'], ['Format', 'Paperback']] },
  { name: 'My First Book of Salah', cat: 'Kids Islamic Books', aud: 'KIDS', price: 6500, art: 'book', colors: ['sky', 'emerald'], label: 'My First Salah', brand: 'Little Believers', material: 'Illustrated board book', theme: 'kids', n: true, desc: 'A step-by-step illustrated board book that teaches children how to pray.', attrs: [['Age', '3 - 7 years'], ['Language', 'English'], ['Format', 'Board book']] },
  { name: 'Islamic Activity and Colouring Book', cat: 'Kids Islamic Books', aud: 'KIDS', price: 4500, art: 'book', colors: ['terracotta'], label: 'Activity Book', brand: 'Little Believers', material: 'Paperback', theme: 'kids', desc: 'Puzzles, colouring pages and activities about the pillars of Islam.', attrs: [['Age', '4 - 10 years'], ['Language', 'English'], ['Format', 'Paperback']] },
  { name: 'Madinah Arabic Reader, Book 1', cat: 'Arabic Learning', aud: 'UNISEX', price: 7500, art: 'book', colors: ['olive'], label: 'Madinah Arabic Reader', brand: 'Darussalam', material: 'Paperback', theme: 'books', desc: 'A structured course for learning to read and understand Arabic.', attrs: [['Author', 'Dr. V. Abdur Rahim'], ['Language', 'Arabic / English'], ['Format', 'Paperback']] },
  { name: 'Ramadan Reflection Journal', cat: 'Journals & Planners', aud: 'UNISEX', price: 9500, art: 'journal', colors: ['emerald', 'plum'], brand: 'Modeza Press', material: 'Hardcover, 120 gsm cream paper', theme: 'books', collection: 'Ramadan', f: true, desc: 'A 30-day journal with daily prompts, a prayer tracker and a Quran reading planner.', attrs: [['Pages', '160'], ['Format', 'Hardcover with ribbon']] },
  { name: 'Muslim Weekly Planner', cat: 'Journals & Planners', aud: 'UNISEX', price: 8000, art: 'journal', colors: ['camel', 'navy'], brand: 'Modeza Press', material: 'Softcover planner', theme: 'books', desc: 'A planner that follows the week with prayer tracking space.', attrs: [['Pages', '120']] },
  { name: 'Raising Confident Muslim Children', cat: 'Parenting', aud: 'UNISEX', price: 8500, art: 'book', colors: ['sand'], label: 'Raising Children', brand: 'Modeza Press', material: 'Paperback', theme: 'books', desc: 'Practical, faith-centred guidance for parents.', attrs: [['Language', 'English'], ['Format', 'Paperback']] },

  // ---- Arabian products
  { name: 'Velvet Prayer Mat with Mihrab Design', cat: 'Prayer Mats', aud: 'UNISEX', price: 18500, art: 'mat', colors: ['emerald', 'burgundy', 'navy'], brand: 'Al Nur', material: 'Velvet with non-slip backing', theme: 'home', f: true, b: true, desc: 'A soft velvet prayer mat with a gold-tone mihrab arch design.', attrs: [['Size', '70 x 110 cm']] },
  { name: 'Foldable Travel Prayer Mat', cat: 'Prayer Mats', aud: 'UNISEX', price: 9500, art: 'mat', colors: ['black', 'taupe'], brand: 'Al Nur', material: 'Water-resistant nylon', theme: 'home', n: true, desc: 'A compact, water-resistant mat with a carry pouch and built-in compass.', attrs: [['Size', '60 x 100 cm'], ['Includes', 'Pouch and compass']] },
  { name: 'Carved Wooden Quran Stand', cat: 'Quran Stands', aud: 'UNISEX', price: 21000, art: 'rehal', colors: ['brown', 'camel'], brand: 'Al Nur', material: 'Solid wood', theme: 'home', desc: 'A folding rehal that rests a Quran at a comfortable reading angle.', attrs: [['Fits', 'Books up to 25 cm wide']] },
  { name: 'Arabesque Wall Art Panel', cat: 'Wall Decor', aud: 'UNISEX', price: 42000, art: 'decor', colors: ['emerald', 'navy'], brand: 'Al Nur', material: 'MDF frame, printed canvas', theme: 'home', desc: 'A framed geometric arabesque panel in deep tones and gold-tone detail.', attrs: [['Size', '60 x 80 cm']] },
  { name: 'Eid Mubarak Gift Box', cat: 'Ramadan & Eid Gifts', aud: 'UNISEX', price: 38000, art: 'giftbox', colors: ['terracotta', 'emerald'], brand: 'Modeza', material: 'Rigid gift box', theme: 'home', collection: 'Eid', f: true, desc: 'A gift box with dates, a tasbih and an attar.', attrs: [['Contents', 'Dates 250 g, tasbih, attar 6 ml']] },
  { name: 'Ramadan Gift Hamper', cat: 'Gift Boxes', aud: 'UNISEX', price: 55000, sale: 47500, art: 'giftbox', colors: ['plum', 'olive'], brand: 'Modeza', material: 'Rigid gift box', theme: 'home', collection: 'Ramadan', n: true, desc: 'A hamper with a journal, bakhoor and dates.', attrs: [['Contents', 'Journal, bakhoor, dates']] },
  { name: 'Umrah Essentials Kit', cat: 'Hajj & Umrah Essentials', aud: 'UNISEX', price: 36000, art: 'giftbox', colors: ['white', 'sand'], brand: 'Al Nur', material: 'Cotton and nylon', theme: 'home', desc: 'A carry kit with an unscented soap, a travel prayer mat, a tasbih and a pouch.', attrs: [['Contents', 'Pouch, mat, tasbih, unscented soap']] },

  // ---- Prophetic medicine
  { name: 'Cold-Pressed Black Seed Oil', cat: 'Black Seed', aud: 'UNISEX', price: 9500, art: 'blackseed', colors: ['brown'], brand: 'Habba Naturals', material: '100% Nigella sativa oil', theme: 'natural', b: true, desc: 'Cold-pressed black seed oil in a dark glass bottle with a dropper.', attrs: [['Quantity', '100 ml'], ['Ingredients', '100% cold-pressed Nigella sativa seed oil'], ['Origin', 'Ethiopia'], ['Storage', 'Store in a cool, dark place; refrigerate after opening'], NOTE_MED] },
  { name: 'Black Seed Honey', cat: 'Black Seed', aud: 'UNISEX', price: 14500, art: 'honey', colors: ['amber'], brand: 'Habba Naturals', material: 'Natural honey with black seed', theme: 'natural', n: true, desc: 'Raw honey blended with ground black seed.', attrs: [['Quantity', '500 g'], ['Ingredients', 'Natural honey, ground Nigella sativa'], ['Origin', 'Ethiopia'], ['Storage', 'Store at room temperature, away from sunlight'], NOTE_MED] },
  { name: 'Sidr Honey', cat: 'Honey', aud: 'UNISEX', price: 38000, art: 'honey', colors: ['amber'], brand: 'Yemen Gold', material: 'Raw sidr honey', theme: 'natural', f: true, desc: 'A rich, dark honey from sidr (Ziziphus) blossoms.', attrs: [['Quantity', '500 g'], ['Ingredients', '100% raw honey'], ['Origin', 'Yemen'], ['Storage', 'Store at room temperature; honey may crystallise naturally'], NOTE_MED] },
  { name: 'Wild Forest Honey', cat: 'Honey', aud: 'UNISEX', price: 12000, art: 'honey', colors: ['amber'], brand: 'Habba Naturals', material: 'Raw honey', theme: 'natural', desc: 'Raw unfiltered forest honey.', attrs: [['Quantity', '500 g'], ['Ingredients', '100% raw honey'], ['Origin', 'Nigeria'], ['Storage', 'Store at room temperature']] },
  { name: 'Zamzam Water 5L', cat: 'Zamzam & Khal', aud: 'UNISEX', price: 24000, art: 'zamzam', colors: ['emerald'], brand: 'Makkah Source', material: 'Sealed bottle', theme: 'natural', desc: 'Zamzam water in a sealed 5L bottle. Availability depends on import authorisation. Sample listing: replace with your licensed supplier\'s details.', attrs: [['Quantity', '5 litres'], ['Origin', 'Makkah, Saudi Arabia'], ['Storage', 'Store in a cool place, away from direct sunlight'], ['Supplier', 'Sample data. Add your licensed supplier here']] },
  { name: 'Natural Apple Cider Khal', cat: 'Zamzam & Khal', aud: 'UNISEX', price: 6500, art: 'zamzam', colors: ['amber'], brand: 'Habba Naturals', material: 'Unfiltered apple cider vinegar with mother', theme: 'natural', desc: 'Unfiltered apple cider vinegar (khal at-tuffah).', attrs: [['Quantity', '500 ml'], ['Ingredients', 'Apple cider vinegar'], ['Storage', 'Store in a cool, dark place']] },
  { name: 'Olive and Habba Herbal Oil Blend', cat: 'Natural Oils & Herbal', aud: 'UNISEX', price: 11000, art: 'oil', colors: ['olive'], brand: 'Habba Naturals', material: 'Olive oil with black seed oil', theme: 'natural', desc: 'A blend of extra virgin olive oil and black seed oil for massage and skin care.', attrs: [['Quantity', '120 ml'], ['Ingredients', 'Extra virgin olive oil, Nigella sativa oil'], ['Storage', 'Store in a cool, dark place'], NOTE_MED] },
  { name: 'Dried Sidr Leaf Powder', cat: 'Natural Oils & Herbal', aud: 'UNISEX', price: 5500, art: 'herbal', colors: ['olive'], brand: 'Habba Naturals', material: 'Ground sidr leaves', theme: 'natural', desc: 'Finely ground sidr leaf powder, traditionally used for hair and skin care.', attrs: [['Quantity', '200 g'], ['Ingredients', '100% ground sidr leaves'], ['Storage', 'Keep sealed in a dry place']] },
];

// ----------------------------------------------------------------------- main
async function main() {
  // The seed rebuilds the catalogue (and clears carts, wishlists and reviews). Never run it by accident on live data.
  if ((await prisma.product.count()) > 0 && !process.env.SEED_FORCE) {
    console.log('Database already has products. Re-run with SEED_FORCE=1 to rebuild the catalogue (this clears carts, wishlists and reviews).');
    return;
  }
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'ChangeMe123!' || process.env.ADMIN_PASSWORD.length < 12)) {
    throw new Error('Set ADMIN_PASSWORD (12+ characters, not the default) before seeding production.');
  }
  console.log('Seeding...');
  // Clean catalogue tables (idempotent re-seed). Orders, users and settings are kept.
  await prisma.$transaction([
    prisma.cartItem.deleteMany(), prisma.wishlistItem.deleteMany(), prisma.recentlyViewed.deleteMany(), prisma.review.deleteMany(),
    prisma.productVariant.deleteMany(), prisma.productImage.deleteMany(), prisma.productAttribute.deleteMany(),
  ]);

  const catIds = new Map<string, string>();
  let order = 0;
  for (const [name, t] of Object.entries(TREE)) {
    const slug = slugify(name);
    const parent = await prisma.category.upsert({
      where: { slug },
      create: { name, nameAr: t.ar, slug, imageUrl: `/products/${t.img}.svg`, sortOrder: order++ },
      update: { name, nameAr: t.ar, imageUrl: `/products/${t.img}.svg`, sortOrder: order - 1 },
    });
    catIds.set(name, parent.id);
    let k = 0;
    for (const [child, ar] of t.kids) {
      const cs = slugify(child);
      const c = await prisma.category.upsert({
        where: { slug: cs }, create: { name: child, nameAr: ar, slug: cs, parentId: parent.id, sortOrder: k++ }, update: { name: child, nameAr: ar, parentId: parent.id, sortOrder: k - 1 },
      });
      catIds.set(child, c.id);
    }
  }

  const written = new Set<string>();
  const art = (s: Spec, color: string, v: 1 | 2) => {
    const file = `${s.art}-${color}-${v}${s.label ? '-' + slugify(s.label) : ''}${s.metal ? '-' + s.metal : ''}${s.kids ? '-k' : ''}.svg`;
    if (!written.has(file)) {
      writeFileSync(join(OUT, file), svg(s.art, COLORS[color].hex, { theme: s.theme, variant: v, label: s.label, kids: s.kids, metal: s.metal }));
      written.add(file);
    }
    return '/products/' + file;
  };

  const products: { id: string; seed: number }[] = [];
  for (const s of S) {
    const slug = slugify(s.name);
    const sku = 'MZ-' + (hash(slug) % 100000).toString().padStart(5, '0');
    const current = s.sale ?? s.price;
    const data = {
      name: s.name, nameAr: s.nameAr ?? null, slug, description: s.desc, categoryId: catIds.get(s.cat)!, audience: s.aud, brand: s.brand, material: s.material,
      priceMinor: naira(s.price), salePriceMinor: s.sale ? naira(s.sale) : null, currentPriceMinor: naira(current), baseSku: sku,
      isFeatured: !!s.f, isNewArrival: !!s.n, isBestSeller: !!s.b, collection: s.collection ?? null, soldCount: (hash(slug) % 180) + (s.b ? 150 : 0), isActive: true,
    };
    if (!data.categoryId) throw new Error('Unknown category ' + s.cat);
    const p = await prisma.product.upsert({ where: { slug }, create: data, update: data });

    const sizes = s.sizes ?? [null as any];
    const variants = [];
    for (const c of s.colors) for (const z of sizes) {
      const h = hash(`${slug}${c}${z}`);
      // a few variants are sold out / low so the UI states can be exercised
      const stock = h % 13 === 0 ? 0 : h % 7 === 0 ? 3 : 8 + (h % 30);
      variants.push({ productId: p.id, sku: `${sku}-${c.slice(0, 3).toUpperCase()}${z ? '-' + String(z).replace(/[^A-Za-z0-9]/g, '') : ''}`, size: z, color: s.colors.length > 1 || s.art !== 'book' ? COLORS[c].name : null, stock });
    }
    await prisma.productVariant.createMany({ data: variants });

    const first = s.colors[0];
    const imgs: { url: string; alt: string }[] = [
      { url: art(s, first, 1), alt: `${s.name} - ${COLORS[first].name}` },
      { url: art(s, first, 2), alt: `${s.name} - ${COLORS[first].name} detail` },
    ];
    for (const c of s.colors.slice(1)) imgs.push({ url: art(s, c, 1), alt: `${s.name} - ${COLORS[c].name}` });
    await prisma.productImage.createMany({ data: imgs.map((i, n) => ({ ...i, productId: p.id, sortOrder: n })) });
    await prisma.productAttribute.createMany({ data: (s.attrs ?? []).map(([key, value]) => ({ productId: p.id, key, value })) });
    products.push({ id: p.id, seed: hash(slug) });
  }

  // ---- banners (hero + promo)
  await prisma.banner.deleteMany();
  const hero = (c: string, t: string) => `/products/${t}-${c}-1.svg`;
  await prisma.banner.createMany({
    data: [
      { title: 'Timeless Elegance', subtitle: 'Minimal designs. Maximum impact. Redefine your wardrobe with pieces that speak sophistication.', ctaLabel: 'Explore Collection', ctaHref: '/shop?category=women', imageUrl: hero('burgundy', 'jilbab'), placement: 'hero', sortOrder: 0 },
      { title: 'Summer Sale: Up to 50% Off', subtitle: 'Refresh your style this season with our exclusive collection. Limited time offer.', ctaLabel: 'Shop the Sale', ctaHref: '/sale', imageUrl: hero('sand', 'dress'), placement: 'promo', sortOrder: 1 },
      { title: 'The Ramadan and Eid Edit', subtitle: 'Gifts, journals, fragrances and festive wear.', ctaLabel: 'Discover', ctaHref: '/shop?collection=Eid', imageUrl: '/products/giftbox-terracotta-1.svg', placement: 'promo', sortOrder: 2 },
    ],
  });

  // ---- sample customers + reviews (testimonials)
  const people = [['Amina Yusuf', 'amina.sample@modeza.test'], ['Fatima Bello', 'fatima.sample@modeza.test'], ['Ibrahim Sani', 'ibrahim.sample@modeza.test'], ['Maryam Adeyemi', 'maryam.sample@modeza.test']];
  const users = [];
  for (const [name, email] of people) users.push(await prisma.user.upsert({ where: { email }, create: { name, email, emailVerified: true }, update: {} }));
  const texts = [
    'The fabric is beautiful and the fit is exactly as described. Delivery was quick too.',
    'Excellent quality for the price. I have already ordered a second one in a different colour.',
    'Packaging was lovely and the product looks even better in person. Highly recommend.',
    'Very happy with this purchase. Soft, well finished and true to size.',
    'Great value and fast shipping. Will be shopping again for Eid.',
  ];
  for (const p of products) {
    const n = 1 + (p.seed % 3);
    for (let i = 0; i < n; i++) {
      const u = users[(p.seed + i) % users.length];
      await prisma.review.upsert({
        where: { productId_userId: { productId: p.id, userId: u.id } },
        create: { productId: p.id, userId: u.id, rating: 4 + ((p.seed + i) % 2), title: 'Lovely', body: texts[(p.seed + i) % texts.length] }, update: {},
      });
    }
    const agg = await prisma.review.aggregate({ where: { productId: p.id }, _avg: { rating: true }, _count: true });
    await prisma.product.update({ where: { id: p.id }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
  }

  // ---- countries, shipping, discounts, faqs, policies, store info
  const countries = [
    { code: 'NG', name: 'Nigeria', language: 'en', currency: 'NGN', rateFromBase: 1, taxPercent: 7.5 },
    { code: 'GB', name: 'United Kingdom', language: 'en', currency: 'GBP', rateFromBase: 0.00052, taxPercent: 0 },
    { code: 'US', name: 'United States', language: 'en', currency: 'USD', rateFromBase: 0.00065, taxPercent: 0 },
    { code: 'SA', name: 'Saudi Arabia', language: 'ar', currency: 'SAR', rateFromBase: 0.0024, taxPercent: 0 },
    { code: 'AE', name: 'United Arab Emirates', language: 'ar', currency: 'AED', rateFromBase: 0.0024, taxPercent: 0 },
    { code: 'GH', name: 'Ghana', language: 'en', currency: 'GHS', rateFromBase: 0.0095, taxPercent: 0 },
  ];
  for (const c of countries) await prisma.supportedCountry.upsert({ where: { code: c.code }, create: c, update: {} });

  if (!(await prisma.shippingMethod.count())) {
    await prisma.shippingMethod.createMany({
      data: [
        { name: 'Standard delivery', priceMinor: naira(3500), freeOverMinor: naira(100000), minDays: 3, maxDays: 7 },
        { name: 'Express delivery', priceMinor: naira(8500), freeOverMinor: null, minDays: 1, maxDays: 3 },
      ],
    });
  }
  await prisma.discountCode.upsert({ where: { code: 'WELCOME10' }, create: { code: 'WELCOME10', type: 'PERCENT', value: 10, minPurchaseMinor: naira(10000) }, update: {} });
  await prisma.discountCode.upsert({ where: { code: 'EID2000' }, create: { code: 'EID2000', type: 'FIXED', value: naira(2000), minPurchaseMinor: naira(20000), usageLimit: 500 }, update: {} });

  await prisma.faq.deleteMany();
  await prisma.faq.createMany({
    data: [
      { question: 'How long does delivery take?', answer: 'Standard delivery takes 3 to 7 business days within Nigeria and express takes 1 to 3 days. International delivery times vary by destination.', sortOrder: 0 },
      { question: 'Can I return an item?', answer: 'Unworn items in original packaging can be returned within 14 days. Perfumes, oils and personalised items are final sale once opened.', sortOrder: 1 },
      { question: 'Is your gold jewelry solid gold?', answer: 'Each product page states the material clearly: solid gold items list their karat and weight, while gold-plated and gold-tone items are labelled as such.', sortOrder: 2 },
      { question: 'Which payment methods do you accept?', answer: 'Cards, bank transfer and USSD through Paystack. We never store your card details.', sortOrder: 3 },
    ],
  });
  const policy = async (key: string, title: string, body: string) =>
    prisma.storeSetting.upsert({ where: { key: `policy.${key}` }, create: { key: `policy.${key}`, value: { title, body } }, update: {} });
  await policy('returns', 'Return policy', 'You may return unworn items in their original packaging within 14 days of delivery. Contact support with your order number to start a return. Refunds are issued to the original payment method.');
  await policy('shipping', 'Shipping policy', 'We ship across Nigeria and to selected countries. Free standard shipping on orders over 100,000 NGN. Orders are dispatched within 1 to 2 business days.');
  await policy('privacy', 'Privacy policy', 'We collect only the information needed to process your order and improve your experience. We never sell your personal data and never store raw card details.');
  await prisma.storeSetting.upsert({ where: { key: 'store.info' }, create: { key: 'store.info', value: { name: 'Modeza', supportEmail: 'support@modeza.test', phone: '+234 800 000 0000', address: 'Lagos, Nigeria', announcement: 'Free standard shipping on orders over NGN 100,000' } }, update: {} });

  // ---- admin
  const email = (process.env.ADMIN_EMAIL || 'admin@modeza.test').toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Store Admin', role: 'ADMIN', emailVerified: true, passwordHash: await bcrypt.hash(pw, 12) },
    update: { role: 'ADMIN' },
  });
  console.log(`Seeded ${S.length} products, ${written.size} artwork files. Admin: ${email}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
