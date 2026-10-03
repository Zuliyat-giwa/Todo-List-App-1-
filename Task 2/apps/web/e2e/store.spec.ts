import { expect, Page, test } from '@playwright/test';

const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@modeza.test', password: process.env.ADMIN_PASSWORD || 'ChangeMe123!' };
const uid = Date.now().toString(36);

async function register(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Playwright Buyer');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/account');
}

async function fillCheckout(page: Page) {
  await page.getByLabel('Full name').fill('Playwright Buyer');
  await page.getByLabel('Email address').fill(`buyer-${uid}@example.com`);
  await page.getByLabel('Phone number').fill('+2348012345678');
  await page.getByTestId('step-next').click();
  await page.getByLabel('State / region').fill('Lagos');
  await page.getByLabel('City').fill('Ikeja');
  await page.getByLabel('Street address').fill('12 Allen Avenue');
  await page.getByTestId('step-next').click();
  await page.getByTestId('step-next').click(); // shipping method (first is preselected)
  await page.getByTestId('step-next').click(); // review
}

test.describe('storefront', () => {
  test('homepage renders every section from database content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Timeless/ })).toBeVisible();
    for (const h of ['New Arrivals', 'Best Sellers', 'Arabian Perfumes', 'Islamic Books', 'Prophetic Medicine', 'Loved by our customers']) {
      await expect(page.getByRole('heading', { name: h }).first()).toBeVisible();
    }
    expect(await page.getByTestId('product-card').count()).toBeGreaterThan(8);
    await expect(page.locator('img[src=""]')).toHaveCount(0);
  });

  test('mega menu, category filtering, sorting and empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Women' }).hover();
    await page.getByRole('link', { name: 'Hijabs' }).first().click();
    await expect(page).toHaveURL(/category=hijabs/);
    await expect(page.getByRole('heading', { name: 'Hijabs', level: 1 })).toBeVisible();
    await page.getByLabel('Sort by').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    const prices = await page.locator('[data-testid=product-card] .font-semibold').allInnerTexts();
    const nums = prices.map((p) => Number(p.replace(/[^\d]/g, '')));
    expect([...nums].sort((a, b) => a - b)).toEqual(nums);
    await page.goto('/shop?q=zzzzzzqqq');
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  test('search suggestions lead to a product page with gallery, options and reviews', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('search').first().getByRole('searchbox').fill('oud');
    await page.getByRole('link', { name: /Royal Oud/ }).first().click();
    await expect(page.getByRole('heading', { name: /Royal Oud/, level: 1 })).toBeVisible();
    await page.getByRole('tab', { name: 'Details' }).click();
    await expect(page.getByText('Concentration')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  });

  test('requires choosing options before adding clothing to the cart, then full guest checkout with payment', async ({ page }) => {
    await page.goto('/product/classic-open-abaya');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Please choose a size');
    await expect(page.getByRole('button', { name: 'Black', exact: true })).toHaveAttribute('aria-pressed', 'true'); // first in-stock colour is pre-selected
    await page.getByRole('button', { name: '54', exact: true }).click();
    await expect(page.getByTestId('stock-status')).toContainText(/In stock|left/);
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible();
    await expect(page.getByTestId('cart-line')).toHaveCount(1);
    await page.getByRole('link', { name: 'Checkout' }).click();

    // invalid details are blocked with messages
    await page.getByTestId('step-next').click();
    await expect(page.getByText('Enter your full name')).toBeVisible();
    await fillCheckout(page);
    await expect(page.getByTestId('checkout-totals')).toContainText('Total');
    await page.getByTestId('pay-now').click();

    // development payment gateway
    await page.getByTestId('mock-success').click();
    await expect(page.getByRole('heading', { name: 'Thank you for your order' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('payment-status')).toHaveText('SUCCESS');
    await expect(page.getByTestId('order-number')).toHaveText(/^MZ-\d{8}-[0-9A-F]{6}$/);
    await expect(page.getByTestId('cart-count')).toHaveCount(0); // cart cleared after payment
  });

  test('failed payment keeps the order pending and offers a retry', async ({ page }) => {
    await page.goto('/product/premium-jersey-hijab');
    await page.getByRole('button', { name: 'Black', exact: true }).click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByRole('link', { name: 'Checkout' }).click();
    await fillCheckout(page);
    await page.getByTestId('pay-now').click();
    await page.getByTestId('mock-fail').click();
    await expect(page.getByRole('heading', { name: 'Awaiting payment' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible();
  });

  test('discount codes: invalid is rejected, valid reduces the total', async ({ page }) => {
    await page.goto('/product/sidr-honey');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.goto('/cart');
    await page.getByLabel('Discount code').fill('NOTACODE');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'not valid' })).toBeVisible();
    await page.getByLabel('Discount code').fill('welcome10');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Code WELCOME10 applied')).toBeVisible();
    await expect(page.getByTestId('totals')).toContainText('Discount');
  });

  test('empty cart shows an empty state', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  });

  test('wishlist works for guests', async ({ page }) => {
    await page.goto('/shop?category=hijabs');
    await page.getByRole('button', { name: 'Wishlist' }).first().click();
    await page.goto('/wishlist');
    await expect(page.getByTestId('product-card')).toHaveCount(1);
  });

  test('language switch to Arabic flips the layout to RTL and persists; currency switch changes prices', async ({ page }) => {
    await page.goto('/product/premium-jersey-hijab');
    const naira = await page.locator('main').getByText(/₦/).first().innerText();
    await page.getByRole('button', { name: /Country, language/ }).click();
    await page.locator('#loc-lang').selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('link', { name: 'الرئيسية' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl'); // persisted (cookie + storage)
    await page.getByRole('button', { name: /الدولة/ }).click();
    await page.locator('#loc-cur').selectOption('USD');
    const usd = await page.locator('main').getByText(/\$|US\$/).first().innerText();
    expect(usd).not.toBe(naira);
    expect(usd).toContain('~'); // conversion is flagged as indicative
  });
});

test.describe('authentication and accounts', () => {
  test('invalid login shows an error; register, view dashboard, sign out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('main [role=alert]')).toContainText('Invalid email or password');

    await register(page, `pw-${uid}@example.com`);
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await expect(page.getByText('Please verify your email address')).toBeVisible();
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/account');
    await expect(page).toHaveURL(/login/);
  });

  test('Google sign-in is wired up (redirects, or reports misconfiguration clearly)', async ({ page }) => {
    await page.goto('/login');
    const res = await page.request.get('/api/auth/google', { maxRedirects: 0 });
    expect([302, 503]).toContain(res.status());
    await expect(page.getByTestId('google-signin')).toBeVisible();
  });

  test('customers cannot open the admin dashboard; admins can', async ({ page }) => {
    await register(page, `nonadmin-${uid}@example.com`);
    await page.goto('/admin');
    await expect(page.getByTestId('admin-forbidden')).toBeVisible();
    expect((await page.request.get('/api/admin/stats')).status()).toBe(403);

    await page.request.post('/api/auth/logout');
    await page.goto('/login?next=/admin');
    await page.getByLabel('Email address').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((u) => u.pathname === '/admin');
    await expect(page.getByTestId('admin-stats')).toBeVisible();
  });
});

test.describe('admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login?next=/admin');
    await page.getByLabel('Email address').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((u) => u.pathname === '/admin');
  });

  test('creates a product that then appears in the storefront, then deletes it', async ({ page }) => {
    const name = `E2E Prayer Mat ${uid}`;
    await page.goto('/admin/products');
    await page.getByTestId('new-product').click();
    const dlg = page.getByRole('dialog', { name: 'Product editor' });
    await dlg.getByLabel('Name', { exact: true }).fill(name);
    await dlg.getByLabel('Category').selectOption({ label: '- Prayer Mats' });
    await dlg.getByLabel('Price (NGN)', { exact: true }).fill('15000');
    await dlg.getByLabel('Base SKU').fill(`E2E-${uid}`);
    await dlg.getByLabel('Description', { exact: true }).fill('Created from the admin dashboard in an end-to-end test.');
    await dlg.getByLabel('Image 1 URL').fill('/products/mat-emerald-1.svg');
    await dlg.getByLabel('Variant SKU').fill(`E2E-${uid}-1`);
    await dlg.getByLabel('Variant stock').fill('4');
    await dlg.getByRole('button', { name: 'Save product' }).click();
    await expect(dlg).toBeHidden();

    await page.goto(`/shop?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId('product-card')).toHaveCount(1);

    await page.goto('/admin/products');
    await page.getByLabel('Search products').fill(name);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.goto(`/shop?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  test('manages an order end to end: ship with tracking, deliver', async ({ page }) => {
    // create a paid order through the public API
    const api = page.request;
    const p = await (await api.get('/api/products/everyday-linen-abaya')).json();
    const v = p.variants.find((x: any) => x.stock > 2);
    const ship = (await (await api.get('/api/cart/shipping-methods')).json())[0];
    const order = await (await api.post('/api/checkout/orders', { data: { customer: { name: 'Admin Flow', email: `flow-${uid}@example.com`, phone: '+2348011111111' }, address: { country: 'NG', state: 'Lagos', city: 'Lekki', street: '1 Admiralty Way' }, shippingMethodId: ship.id, items: [{ variantId: v.id, quantity: 1 }] } })).json();
    const init = await (await api.post(`/api/payments/${order.orderNumber}/initialize`, { data: { email: order.email } })).json();
    await api.post('/api/payments/dev/complete', { data: { reference: init.reference, outcome: 'success' } });

    await page.goto('/admin/orders');
    await page.getByLabel('Search orders').fill(order.orderNumber);
    await page.getByRole('button', { name: 'Manage' }).first().click();
    const dlg = page.getByRole('dialog', { name: new RegExp(order.orderNumber) });
    await dlg.getByLabel('Carrier').fill('DHL');
    await dlg.getByLabel('Tracking number').fill(`TRK${uid}`);
    await dlg.getByRole('button', { name: 'Ship with tracking' }).click();
    await expect(dlg.getByTestId('admin-order-status')).toHaveText('SHIPPED');
    await dlg.getByRole('button', { name: 'Mark delivered' }).click();
    await expect(dlg.getByTestId('admin-order-status')).toHaveText('DELIVERED');

    // customer-facing tracking page shows the shipment
    await page.goto(`/order/${order.orderNumber}?email=${encodeURIComponent(order.email)}`);
    await expect(page.getByText(`TRK${uid}`)).toBeVisible();
  });
});
