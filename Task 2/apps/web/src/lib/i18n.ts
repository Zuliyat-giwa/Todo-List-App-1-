export type Locale = 'en' | 'ar';

const en = {
  'nav.home': 'Home', 'nav.new': 'New Arrivals', 'nav.women': 'Women', 'nav.men': 'Men', 'nav.kids': 'Kids', 'nav.accessories': 'Accessories',
  'nav.perfumes': 'Perfumes', 'nav.books': 'Islamic Books', 'nav.arabian': 'Arabian Products', 'nav.medicine': 'Prophetic Medicine', 'nav.sale': 'Sale',
  'nav.search': 'Search', 'nav.account': 'Account', 'nav.wishlist': 'Wishlist', 'nav.cart': 'Cart', 'nav.menu': 'Menu', 'nav.viewAll': 'View all',
  'search.placeholder': 'Search abayas, oud, books...', 'search.noResults': 'No suggestions',
  'announce.default': 'Free standard shipping on orders over NGN 100,000',
  'hero.eyebrow': 'New collection 2026', 'hero.cta': 'Explore Collection', 'hero.secondary': 'Shop the Sale',
  'trust.ship': 'Free Shipping', 'trust.shipSub': 'On orders over NGN 100,000', 'trust.returns': 'Easy Returns', 'trust.returnsSub': '14-day return policy',
  'trust.pay': 'Secure Payment', 'trust.paySub': '100% protected by Paystack', 'trust.support': '24/7 Support', 'trust.supportSub': "We're here to help",
  'home.shopBy': 'Shop by', 'home.category': 'Category', 'home.newArrivals': 'New Arrivals', 'home.bestSellers': 'Best Sellers', 'home.featured': 'Featured Women\'s Collection',
  'home.men': 'Men\'s Collection', 'home.kids': 'Kids\' Collection', 'home.perfumes': 'Arabian Perfumes', 'home.books': 'Islamic Books', 'home.medicine': 'Prophetic Medicine',
  'home.seasonal': 'Ramadan & Eid', 'home.testimonials': 'Loved by our customers', 'home.newsletter': 'Join the Modeza circle', 'home.newsletterSub': 'New arrivals, Ramadan and Eid collections, and exclusive offers.',
  'home.social': 'Follow @modeza', 'home.viewAllCats': 'View All Categories',
  'common.addToCart': 'Add to Cart', 'common.buyNow': 'Buy Now', 'common.outOfStock': 'Out of stock', 'common.inStock': 'In stock', 'common.lowStock': 'Only {n} left',
  'common.subscribe': 'Subscribe', 'common.email': 'Email address', 'common.save': 'Save', 'common.cancel': 'Cancel', 'common.loading': 'Loading...', 'common.retry': 'Try again',
  'common.continue': 'Continue', 'common.back': 'Back', 'common.remove': 'Remove', 'common.apply': 'Apply', 'common.total': 'Total', 'common.subtotal': 'Subtotal',
  'common.discount': 'Discount', 'common.shipping': 'Shipping', 'common.tax': 'Tax', 'common.free': 'Free', 'common.sale': 'Sale', 'common.new': 'New',
  'shop.title': 'Shop', 'shop.filters': 'Filters', 'shop.sort': 'Sort by', 'shop.newest': 'Newest', 'shop.priceLow': 'Price: low to high', 'shop.priceHigh': 'Price: high to low',
  'shop.popular': 'Most popular', 'shop.rating': 'Top rated', 'shop.price': 'Price', 'shop.size': 'Size', 'shop.color': 'Color', 'shop.brand': 'Brand', 'shop.availability': 'Availability',
  'shop.inStockOnly': 'In stock only', 'shop.minRating': 'Rating', 'shop.clear': 'Clear filters', 'shop.results': '{n} products', 'shop.empty': 'No products match your filters',
  'shop.emptySub': 'Try removing a filter or searching for something else.', 'shop.error': 'We could not load products.', 'shop.grid': 'Grid view', 'shop.list': 'List view',
  'shop.prev': 'Previous', 'shop.next': 'Next', 'shop.category': 'Category',
  'pdp.size': 'Size', 'pdp.color': 'Color', 'pdp.qty': 'Quantity', 'pdp.sizeGuide': 'Size guide', 'pdp.description': 'Description', 'pdp.details': 'Details', 'pdp.shipping': 'Shipping & returns',
  'pdp.reviews': 'Reviews', 'pdp.related': 'You may also like', 'pdp.recent': 'Recently viewed', 'pdp.selectOptions': 'Select options', 'pdp.sku': 'SKU', 'pdp.material': 'Material',
  'pdp.writeReview': 'Write a review', 'pdp.noReviews': 'No reviews yet.', 'pdp.shipInfo': 'Free standard shipping over NGN 100,000. Delivery in 3-7 business days within Nigeria.',
  'pdp.returnInfo': 'Unworn items can be returned within 14 days. Perfumes and oils are final sale once opened.', 'pdp.added': 'Added to cart',
  'cart.title': 'Your cart', 'cart.empty': 'Your cart is empty', 'cart.emptySub': 'Discover something beautiful.', 'cart.checkout': 'Checkout', 'cart.continue': 'Continue shopping',
  'cart.code': 'Discount code', 'cart.codePlaceholder': 'Enter code', 'cart.issue': 'Please review the highlighted items',
  'checkout.title': 'Checkout', 'checkout.customer': 'Your details', 'checkout.address': 'Shipping address', 'checkout.method': 'Delivery', 'checkout.review': 'Review', 'checkout.payment': 'Payment',
  'checkout.name': 'Full name', 'checkout.phone': 'Phone number', 'checkout.country': 'Country', 'checkout.state': 'State / region', 'checkout.city': 'City', 'checkout.street': 'Street address',
  'checkout.postal': 'Postal code', 'checkout.notes': 'Delivery instructions', 'checkout.pay': 'Pay now', 'checkout.processing': 'Redirecting to secure payment...',
  'checkout.currencyNote': 'Prices are shown in your selected currency for reference. You will be charged in NGN.', 'checkout.est': 'Estimated delivery',
  'order.thanks': 'Thank you for your order', 'order.number': 'Order number', 'order.status': 'Status', 'order.payment': 'Payment', 'order.tracking': 'Tracking', 'order.confirmEmail': 'A confirmation email is on its way to {email}.',
  'order.pending': 'Awaiting payment', 'order.verifying': 'Confirming your payment...',
  'auth.login': 'Sign in', 'auth.register': 'Create account', 'auth.logout': 'Sign out', 'auth.google': 'Continue with Google', 'auth.or': 'or', 'auth.password': 'Password', 'auth.name': 'Full name',
  'auth.forgot': 'Forgot password?', 'auth.noAccount': 'New to Modeza?', 'auth.haveAccount': 'Already have an account?', 'auth.resetTitle': 'Reset your password', 'auth.sendLink': 'Send reset link',
  'account.title': 'My account', 'account.overview': 'Overview', 'account.orders': 'Orders', 'account.addresses': 'Addresses', 'account.wishlist': 'Wishlist', 'account.settings': 'Settings',
  'account.recent': 'Recently viewed', 'account.noOrders': 'You have not placed any orders yet.', 'account.prefs': 'Language & currency',
  'footer.shop': 'Shop', 'footer.help': 'Help', 'footer.company': 'Company', 'footer.faq': 'FAQ', 'footer.returns': 'Returns', 'footer.shippingPolicy': 'Shipping', 'footer.privacy': 'Privacy',
  'footer.tag': 'Modest fashion, fragrance, books and lifestyle essentials.', 'footer.rights': 'All rights reserved.',
  'locale.title': 'Country, language & currency', 'locale.country': 'Ship to', 'locale.language': 'Language', 'locale.currency': 'Currency',
  'locale.note': 'Converted prices are indicative. Orders are charged in NGN.',
  'badge.sold': 'Sold out',
};

const ar: Partial<typeof en> = {
  'nav.home': 'الرئيسية', 'nav.new': 'وصل حديثاً', 'nav.women': 'نساء', 'nav.men': 'رجال', 'nav.kids': 'أطفال', 'nav.accessories': 'إكسسوارات', 'nav.perfumes': 'عطور',
  'nav.books': 'كتب إسلامية', 'nav.arabian': 'منتجات عربية', 'nav.medicine': 'الطب النبوي', 'nav.sale': 'تخفيضات', 'nav.search': 'بحث', 'nav.account': 'حسابي', 'nav.wishlist': 'المفضلة',
  'nav.cart': 'السلة', 'nav.menu': 'القائمة', 'nav.viewAll': 'عرض الكل',
  'search.placeholder': 'ابحث عن عبايات، عود، كتب...', 'search.noResults': 'لا توجد اقتراحات',
  'announce.default': 'شحن قياسي مجاني للطلبات فوق 100,000 نيرة',
  'hero.eyebrow': 'مجموعة 2026 الجديدة', 'hero.cta': 'اكتشف المجموعة', 'hero.secondary': 'تسوق التخفيضات',
  'trust.ship': 'شحن مجاني', 'trust.shipSub': 'للطلبات فوق 100,000 نيرة', 'trust.returns': 'إرجاع سهل', 'trust.returnsSub': 'سياسة إرجاع 14 يوماً', 'trust.pay': 'دفع آمن', 'trust.paySub': 'محمي بالكامل',
  'trust.support': 'دعم على مدار الساعة', 'trust.supportSub': 'نحن هنا لمساعدتك',
  'home.shopBy': 'تسوق حسب', 'home.category': 'الفئة', 'home.newArrivals': 'وصل حديثاً', 'home.bestSellers': 'الأكثر مبيعاً', 'home.featured': 'مجموعة النساء المميزة', 'home.men': 'مجموعة الرجال',
  'home.kids': 'مجموعة الأطفال', 'home.perfumes': 'العطور العربية', 'home.books': 'الكتب الإسلامية', 'home.medicine': 'الطب النبوي', 'home.seasonal': 'رمضان والعيد',
  'home.testimonials': 'يحبها عملاؤنا', 'home.newsletter': 'انضم إلى عائلة مديزة', 'home.newsletterSub': 'وصل حديثاً ومجموعات رمضان والعيد وعروض حصرية.', 'home.social': 'تابعنا @modeza', 'home.viewAllCats': 'عرض كل الفئات',
  'common.addToCart': 'أضف إلى السلة', 'common.buyNow': 'اشتر الآن', 'common.outOfStock': 'غير متوفر', 'common.inStock': 'متوفر', 'common.lowStock': 'متبقي {n} فقط', 'common.subscribe': 'اشترك',
  'common.email': 'البريد الإلكتروني', 'common.save': 'حفظ', 'common.cancel': 'إلغاء', 'common.loading': 'جارٍ التحميل...', 'common.retry': 'حاول مرة أخرى', 'common.continue': 'متابعة', 'common.back': 'رجوع',
  'common.remove': 'إزالة', 'common.apply': 'تطبيق', 'common.total': 'الإجمالي', 'common.subtotal': 'المجموع الفرعي', 'common.discount': 'الخصم', 'common.shipping': 'الشحن', 'common.tax': 'الضريبة',
  'common.free': 'مجاني', 'common.sale': 'تخفيض', 'common.new': 'جديد',
  'shop.title': 'تسوق', 'shop.filters': 'تصفية', 'shop.sort': 'ترتيب حسب', 'shop.newest': 'الأحدث', 'shop.priceLow': 'السعر: من الأقل', 'shop.priceHigh': 'السعر: من الأعلى', 'shop.popular': 'الأكثر شعبية',
  'shop.rating': 'الأعلى تقييماً', 'shop.price': 'السعر', 'shop.size': 'المقاس', 'shop.color': 'اللون', 'shop.brand': 'العلامة', 'shop.availability': 'التوفر', 'shop.inStockOnly': 'المتوفر فقط',
  'shop.minRating': 'التقييم', 'shop.clear': 'مسح التصفية', 'shop.results': '{n} منتج', 'shop.empty': 'لا توجد منتجات مطابقة', 'shop.emptySub': 'جرّب إزالة عامل تصفية أو البحث عن شيء آخر.',
  'shop.error': 'تعذر تحميل المنتجات.', 'shop.grid': 'عرض شبكي', 'shop.list': 'عرض قائمة', 'shop.prev': 'السابق', 'shop.next': 'التالي', 'shop.category': 'الفئة',
  'pdp.size': 'المقاس', 'pdp.color': 'اللون', 'pdp.qty': 'الكمية', 'pdp.sizeGuide': 'دليل المقاسات', 'pdp.description': 'الوصف', 'pdp.details': 'التفاصيل', 'pdp.shipping': 'الشحن والإرجاع',
  'pdp.reviews': 'التقييمات', 'pdp.related': 'قد يعجبك أيضاً', 'pdp.recent': 'شوهد مؤخراً', 'pdp.selectOptions': 'اختر الخيارات', 'pdp.sku': 'رمز المنتج', 'pdp.material': 'الخامة',
  'pdp.writeReview': 'اكتب تقييماً', 'pdp.noReviews': 'لا توجد تقييمات بعد.', 'pdp.added': 'تمت الإضافة إلى السلة',
  'cart.title': 'سلتك', 'cart.empty': 'سلتك فارغة', 'cart.emptySub': 'اكتشف شيئاً جميلاً.', 'cart.checkout': 'إتمام الشراء', 'cart.continue': 'متابعة التسوق', 'cart.code': 'رمز الخصم', 'cart.codePlaceholder': 'أدخل الرمز',
  'checkout.title': 'إتمام الشراء', 'checkout.customer': 'بياناتك', 'checkout.address': 'عنوان الشحن', 'checkout.method': 'التوصيل', 'checkout.review': 'مراجعة', 'checkout.payment': 'الدفع',
  'checkout.name': 'الاسم الكامل', 'checkout.phone': 'رقم الهاتف', 'checkout.country': 'الدولة', 'checkout.state': 'الولاية / المنطقة', 'checkout.city': 'المدينة', 'checkout.street': 'عنوان الشارع',
  'checkout.postal': 'الرمز البريدي', 'checkout.notes': 'تعليمات التوصيل', 'checkout.pay': 'ادفع الآن', 'checkout.processing': 'جارٍ التحويل إلى الدفع الآمن...',
  'checkout.currencyNote': 'الأسعار المعروضة بعملتك للاسترشاد فقط. سيتم الخصم بالنيرة النيجيرية.', 'checkout.est': 'التوصيل المتوقع',
  'order.thanks': 'شكراً لطلبك', 'order.number': 'رقم الطلب', 'order.status': 'الحالة', 'order.payment': 'الدفع', 'order.tracking': 'التتبع', 'order.confirmEmail': 'تم إرسال رسالة تأكيد إلى {email}.',
  'order.pending': 'بانتظار الدفع', 'order.verifying': 'جارٍ تأكيد الدفع...',
  'auth.login': 'تسجيل الدخول', 'auth.register': 'إنشاء حساب', 'auth.logout': 'تسجيل الخروج', 'auth.google': 'المتابعة عبر جوجل', 'auth.or': 'أو', 'auth.password': 'كلمة المرور', 'auth.name': 'الاسم الكامل',
  'auth.forgot': 'نسيت كلمة المرور؟', 'auth.noAccount': 'جديد في مديزة؟', 'auth.haveAccount': 'لديك حساب؟', 'auth.resetTitle': 'إعادة تعيين كلمة المرور', 'auth.sendLink': 'إرسال الرابط',
  'account.title': 'حسابي', 'account.overview': 'نظرة عامة', 'account.orders': 'الطلبات', 'account.addresses': 'العناوين', 'account.wishlist': 'المفضلة', 'account.settings': 'الإعدادات',
  'account.recent': 'شوهد مؤخراً', 'account.noOrders': 'لم تقم بأي طلب بعد.', 'account.prefs': 'اللغة والعملة',
  'footer.shop': 'تسوق', 'footer.help': 'مساعدة', 'footer.company': 'الشركة', 'footer.faq': 'الأسئلة الشائعة', 'footer.returns': 'الإرجاع', 'footer.shippingPolicy': 'الشحن', 'footer.privacy': 'الخصوصية',
  'footer.tag': 'أزياء محتشمة وعطور وكتب ومستلزمات نمط الحياة.', 'footer.rights': 'جميع الحقوق محفوظة.',
  'locale.title': 'الدولة واللغة والعملة', 'locale.country': 'الشحن إلى', 'locale.language': 'اللغة', 'locale.currency': 'العملة', 'locale.note': 'الأسعار المحوّلة تقريبية. يتم الخصم بالنيرة النيجيرية.',
  'badge.sold': 'نفد',
};

export type Key = keyof typeof en;
const dict = { en, ar };

export function translate(locale: Locale, key: Key | string, vars?: Record<string, string | number>) {
  let s = ((dict[locale] as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key) as string;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Format minor NGN units for display in the chosen currency. Non-NGN is an indicative conversion. */
export function formatMoney(minor: number, currency: string, rate: number, locale: Locale) {
  const isBase = currency === 'NGN';
  const value = (minor / 100) * (isBase ? 1 : rate);
  const nf = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: isBase || value >= 100 ? 0 : 2,
  });
  return (isBase ? '' : '~') + nf.format(value);
}
