/**
 * Local QA harness.
 *
 * Boots the compiled NestJS API (dist/main.js) with the settings from
 * apps/api/.env, waits for /health, then exercises the whole store over HTTP:
 * catalogue, search, cart quoting, checkout, payment, order retrieval,
 * authentication/authorisation and admin CRUD. Prints a PASS/FAIL table and
 * writes the full report to qa-report.json.
 *
 * Usage:  node scripts/qa-local.mjs      (from apps/api)
 */
import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const apiDir = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(apiDir, '.env'), quiet: true });

const PORT = Number(process.env.QA_PORT || 4177);
const EXTERNAL_BASE = process.env.QA_BASE || '';
const BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@modeza.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const LOG_FILE = path.join(apiDir, 'qa-log.txt');

const results = [];
const record = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${String(detail).slice(0, 200)}`}`;
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 500) });
  try {
    appendFileSync(LOG_FILE, line + '\n');
  } catch {
    /* logging must never break the run */
  }
  console.log(line);
};

async function api(method, url, body, cookie) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  const setCookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  return { status: res.status, json, text, setCookie };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await api('GET', '/health');
      if (r.status === 200) return true;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  return false;
}

const child = EXTERNAL_BASE
  ? null
  : spawn(process.execPath, ['dist/main.js'], {
      cwd: apiDir,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: process.env.NODE_ENV || 'production', ALLOW_TEST_PAYMENTS: process.env.ALLOW_TEST_PAYMENTS || 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
let serverLog = '';
if (child) {
  child.stdout.on('data', (d) => (serverLog += d.toString()));
  child.stderr.on('data', (d) => (serverLog += d.toString()));
}

const finish = () => {
  const failed = results.filter((r) => !r.ok);
  const report = {
    ranAt: new Date().toISOString(),
    base: BASE,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
    serverLogTail: serverLog.slice(-3000),
  };
  writeFileSync(path.join(apiDir, 'qa-report.json'), JSON.stringify(report, null, 2));
  const summary = `\n${report.passed}/${report.total} checks passed. Report: apps/api/qa-report.json\n`;
  console.log(summary);
  try {
    appendFileSync(LOG_FILE, summary);
  } catch {
    /* ignore */
  }
  try {
    child?.kill('SIGKILL');
  } catch {
    /* already gone */
  }
  process.exit(failed.length ? 1 : 0);
};

try {
  if (!(await waitForHealth())) {
    record('API boots and /health responds', false, serverLog.slice(-800));
    finish();
  }
  record('API boots and /health responds', true);

  // ---------------------------------------------------------------- catalogue
  const cats = await api('GET', '/categories');
  record('GET /categories returns the tree', cats.status === 200 && Array.isArray(cats.json) && cats.json.length > 0, `status ${cats.status}`);
  const firstCat = cats.json?.[0];

  const list = await api('GET', '/products?limit=8');
  record('GET /products returns items from the database', list.status === 200 && (list.json?.items?.length ?? 0) > 0, `status ${list.status} items ${list.json?.items?.length}`);
  record('Product list exposes pagination metadata', typeof list.json?.total === 'number');

  const search = await api('GET', '/products?q=abaya&limit=5');
  record('GET /products?q=abaya searches the catalogue', search.status === 200 && (search.json?.items?.length ?? 0) > 0, `found ${search.json?.items?.length}`);

  const suggest = await api('GET', '/products/suggest?q=thobe');
  record('GET /products/suggest returns suggestions', suggest.status === 200 && Array.isArray(suggest.json));

  const slug = list.json.items[0].slug;
  const detail = await api('GET', `/products/${slug}`);
  const product = detail.json;
  record('GET /products/:slug returns a full product', detail.status === 200 && product?.slug === slug && (product?.variants?.length ?? 0) > 0, `status ${detail.status}`);
  record('Product has images and a price', (product?.images?.length ?? 0) > 0 && product?.currentPriceMinor > 0, JSON.stringify({ images: product?.images?.length, price: product?.currentPriceMinor }));

  const facets = await api('GET', '/products/facets');
  record('GET /products/facets returns filter data', facets.status === 200 && !!facets.json);

  const shipping = await api('GET', '/cart/shipping-methods');
  record('GET /cart/shipping-methods returns methods', shipping.status === 200 && (shipping.json?.length ?? 0) > 0, `count ${shipping.json?.length}`);
  const shipId = shipping.json[0]?.id;

  const countries = await api('GET', '/content/countries');
  record('GET /content/countries returns the supported countries', countries.status === 200 && (countries.json?.length ?? 0) >= 5, `count ${countries.json?.length}`);

  const home = await api('GET', '/content/home');
  record('GET /content/home returns merchandising sections', home.status === 200 && (home.json?.newArrivals?.length ?? 0) > 0, `status ${home.status}`);

  // ------------------------------------------------------------- cart + quote
  const inStock = product.variants.filter((v) => v.stock > 2);
  record('Product has at least one in-stock variant', inStock.length > 0, `variants ${product.variants.length}`);
  const variantId = inStock[0].id;
  const stockBefore = inStock[0].stock;

  const quote = await api('POST', '/cart/quote', { items: [{ variantId, quantity: 2 }], shippingMethodId: shipId, country: 'NG' });
  const q = quote.json;
  record('POST /cart/quote prices the cart server-side', quote.status === 200 && q?.valid === true && q.subtotalMinor > 0, JSON.stringify({ status: quote.status, valid: q?.valid, subtotal: q?.subtotalMinor }));
  record('Quote exposes subtotal, shipping, tax and total consistently', q?.shippingMinor !== undefined && q?.totalMinor === q.subtotalMinor - q.discountMinor + q.shippingMinor + q.taxMinor, JSON.stringify({ sub: q?.subtotalMinor, ship: q?.shippingMinor, tax: q?.taxMinor, total: q?.totalMinor }));

  record('Quantity 0 is rejected (400)', (await api('POST', '/cart/quote', { items: [{ variantId, quantity: 0 }] })).status === 400);
  record('Unknown variant is rejected (400)', (await api('POST', '/cart/quote', { items: [{ variantId: 'does-not-exist', quantity: 1 }] })).status === 400);
  record('Client-supplied price field is rejected (400)', (await api('POST', '/cart/quote', { items: [{ variantId, quantity: 1, price: 1 }] })).status === 400);
  record('Unknown shipping method is rejected (400)', (await api('POST', '/cart/quote', { items: [{ variantId, quantity: 1 }], shippingMethodId: 'nope' })).status === 400);
  const badCode = await api('POST', '/cart/quote', { items: [{ variantId, quantity: 1 }], code: 'NOT-A-CODE' });
  record('Invalid discount code reports a friendly error', badCode.status === 200 && !!badCode.json?.discountError, JSON.stringify(badCode.json?.discountError));

// --------------------------------------------------------------- checkout
  const customer = { name: 'QA Harness', email: `qa+${Date.now()}@modeza.test`, phone: '+2348012345678' };
  const address = { country: 'NG', state: 'Lagos', city: 'Ikeja', street: '12 Test Avenue', postalCode: '100001', notes: 'Ring the bell' };
  const one = [{ variantId, quantity: 1 }];

  record('Checkout without a customer block is rejected (400)', (await api('POST', '/checkout/orders', { address, shippingMethodId: shipId, items: one })).status === 400);
  record('Checkout with an invalid email is rejected (400)', (await api('POST', '/checkout/orders', { customer: { ...customer, email: 'not-an-email' }, address, shippingMethodId: shipId, items: one })).status === 400);
  record('Checkout with an invalid address is rejected (400)', (await api('POST', '/checkout/orders', { customer, address: { country: 'NGA', state: '', city: '', street: 'x' }, shippingMethodId: shipId, items: one })).status === 400);
  record('Checkout with an empty cart is rejected (400)', (await api('POST', '/checkout/orders', { customer, address, shippingMethodId: shipId, items: [] })).status === 400);

  const order = await api('POST', '/checkout/orders', { customer, address, shippingMethodId: shipId, items: [{ variantId, quantity: 2 }], idempotencyKey: `qa-${Date.now()}` });
  const created = order.json;
  record('POST /checkout/orders creates an order', (order.status === 200 || order.status === 201) && !!created?.orderNumber, `status ${order.status} ${created?.orderNumber}`);
  record('New order starts as PENDING_PAYMENT', created?.status === 'PENDING_PAYMENT', created?.status);
  record('Order stores the line items with quantities', created?.items?.[0]?.quantity === 2, JSON.stringify(created?.items?.[0]));
  record('Order stores the delivery address', created?.address?.city === 'Ikeja' && created?.address?.street === '12 Test Avenue', JSON.stringify(created?.address));

  const stockAfterOrder = (await api('GET', `/products/${slug}`)).json.variants.find((v) => v.id === variantId).stock;
  record('Stock is reserved on order creation', stockAfterOrder === stockBefore - 2, `before ${stockBefore} after ${stockAfterOrder}`);

  const fetchOrder = await api('GET', `/orders/${created.orderNumber}?email=${encodeURIComponent(customer.email)}`);
  record('GET /orders/:number returns the order for the buyer', fetchOrder.status === 200 && fetchOrder.json?.orderNumber === created.orderNumber, `status ${fetchOrder.status}`);
  record('Order totals match the server-side quote', fetchOrder.json?.totalMinor > 0 && fetchOrder.json?.subtotalMinor === created.subtotalMinor);
  record('Order lookup with the wrong email is refused', [403, 404].includes((await api('GET', `/orders/${created.orderNumber}?email=someone-else@example.com`)).status));
  record('Unknown order number returns 404', (await api('GET', '/orders/XXX-0000?email=nobody@example.com')).status === 404);

  // ---------------------------------------------------------------- payment
  const init = await api('POST', `/payments/${created.orderNumber}/initialize`, { email: customer.email });
  record('POST /payments/:no/initialize returns a payment reference', init.status === 200 && !!init.json?.reference, `status ${init.status}`);
  const reference = init.json?.reference;

  record('Completing an unknown payment reference returns 404', (await api('POST', '/payments/dev/complete', { reference: 'MZ-does-not-exist', outcome: 'success' })).status === 404);

  const complete = await api('POST', '/payments/dev/complete', { reference, outcome: 'success' });
  record('Payment completes and reports SUCCESS', complete.status === 200 && complete.json?.status === 'SUCCESS', JSON.stringify(complete.json));

  const paidOrder = await api('GET', `/orders/${created.orderNumber}?email=${encodeURIComponent(customer.email)}`);
  record('Order status becomes PAID after payment', paidOrder.json?.status === 'PAID', paidOrder.json?.status);
  record('Payment record is attached to the order', paidOrder.json?.payment?.status === 'SUCCESS', JSON.stringify(paidOrder.json?.payment));

  const doublePay = await api('POST', `/payments/${created.orderNumber}/initialize`, { email: customer.email });
  record('A paid order cannot be paid twice', [400, 409].includes(doublePay.status), `status ${doublePay.status}`);

  const webhookNoSig = await api('POST', '/payments/webhook/paystack', { event: 'charge.success', data: { reference } });
  record('Unsigned Paystack webhook is rejected (403)', webhookNoSig.status === 403, `status ${webhookNoSig.status}`);

  // ------------------------------------------------------ out of stock guard
  const all = await api('GET', '/products?limit=100');
  let foundOos = false;
  for (const p of (all.json?.items ?? []).slice(0, 40)) {
    const d = (await api('GET', `/products/${p.slug}`)).json;
    const v = d?.variants?.find((x) => x.stock === 0);
    if (!v) continue;
    foundOos = true;
    record('Found a sold-out variant to test with', true, `${d.slug} / ${v.sku}`);
    const oosQuote = await api('POST', '/cart/quote', { items: [{ variantId: v.id, quantity: 1 }] });
    record('Out-of-stock variant quotes valid=false with an issue flag', oosQuote.json?.valid === false && oosQuote.json?.lines?.[0]?.issue === 'OUT_OF_STOCK', JSON.stringify(oosQuote.json?.lines?.[0]?.issue));
    record('Checkout with an out-of-stock item is rejected', (await api('POST', '/checkout/orders', { customer, address, shippingMethodId: shipId, items: [{ variantId: v.id, quantity: 1 }] })).status >= 400);
    record('Checkout above the available stock is rejected', (await api('POST', '/checkout/orders', { customer, address, shippingMethodId: shipId, items: [{ variantId, quantity: 99 }] })).status >= 400);
    break;
  }
  if (!foundOos) record('Found a sold-out variant to test with', false, 'none in this catalogue');

// ------------------------------------------------------------------- auth
  const email = `qa-user-${Date.now()}@modeza.test`;
  const reg = await api('POST', '/auth/register', { name: 'QA User', email, password: 'Str0ngPassw0rd!' });
  const cookie = reg.setCookie;
  record('POST /auth/register creates an account and sets a session cookie', reg.status === 201 && cookie.includes('modeza_session'), `status ${reg.status}`);
  record('Registering the same email twice is rejected (400)', (await api('POST', '/auth/register', { name: 'QA User', email, password: 'Str0ngPassw0rd!' })).status === 400);
  record('A weak password is rejected (400)', (await api('POST', '/auth/register', { name: 'QA User', email: `x${Date.now()}@modeza.test`, password: 'short' })).status === 400);
  record('New accounts start unverified (verification email triggered)', reg.json?.user?.emailVerified === false, JSON.stringify(reg.json?.user));

  const me = await api('GET', '/auth/me', undefined, cookie);
  record('GET /auth/me returns the signed-in user', me.status === 200 && me.json?.user?.email === email, JSON.stringify(me.json));
  record('GET /auth/me returns user:null for guests', (await api('GET', '/auth/me')).json?.user === null);
  record('Login with a wrong password is rejected (401)', (await api('POST', '/auth/login', { email, password: 'wrong-password' })).status === 401);
  record('Login with an unknown email is rejected (401)', (await api('POST', '/auth/login', { email: 'nobody@modeza.test', password: 'Str0ngPassw0rd!' })).status === 401);
  const login = await api('POST', '/auth/login', { email, password: 'Str0ngPassw0rd!' });
  record('Login with the right password succeeds', login.status === 200 && !!login.setCookie, `status ${login.status}`);
  record('GET /auth/google is unavailable until Google credentials are set', [503, 302].includes((await api('GET', '/auth/google')).status));

  record('PUT /cart saves the signed-in cart', (await api('PUT', '/cart', { items: [{ variantId, quantity: 1 }] }, cookie)).status === 200);
  record('GET /cart returns the saved cart', (await api('GET', '/cart', undefined, cookie)).json?.items?.[0]?.variantId === variantId);
  record('GET /cart requires a session (401 for guests)', (await api('GET', '/cart')).status === 401);

  const profile = await api('PATCH', '/account/profile', { name: 'QA User Updated', language: 'ar', currency: 'SAR', country: 'SA' }, cookie);
  record('PATCH /account/profile stores language/currency preferences', profile.status === 200 && profile.json?.user?.language === 'ar', JSON.stringify(profile.json?.user));
  const addr = await api('POST', '/account/addresses', { label: 'Home', fullName: 'QA User', phone: '+2348012345678', country: 'NG', state: 'Lagos', city: 'Ikeja', street: '1 QA Close', isDefault: true }, cookie);
  record('POST /account/addresses saves an address', [200, 201].includes(addr.status), `status ${addr.status}`);
  record('GET /account/addresses lists the saved address', ((await api('GET', '/account/addresses', undefined, cookie)).json ?? []).length === 1);
  record('Wishlist add/list/remove works', await wishlistRoundTrip(cookie));
  record('GET /orders lists the signed-in customer orders', Array.isArray((await api('GET', '/orders', undefined, cookie)).json));
  record('Account data is isolated (guests cannot read addresses)', (await api('GET', '/account/addresses')).status === 401);

// -------------------------------------------------------------- admin area
  record('/admin/stats without a session is 401', (await api('GET', '/admin/stats')).status === 401);
  record('/admin/stats as a customer is 403', (await api('GET', '/admin/stats', undefined, cookie)).status === 403);

  const adminLogin = await api('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const adminCookie = adminLogin.setCookie;
  record(`Admin account (${ADMIN_EMAIL}) can sign in`, adminLogin.status === 200 && !!adminCookie, `status ${adminLogin.status}`);

  if (adminCookie) {
    const stats = await api('GET', '/admin/stats', undefined, adminCookie);
    record('/admin/stats returns KPIs', stats.status === 200 && typeof stats.json?.totalProducts === 'number', JSON.stringify({ status: stats.status, products: stats.json?.totalProducts, orders: stats.json?.totalOrders }));

    const adminOrders = await api('GET', `/admin/orders?q=${created.orderNumber}`, undefined, adminCookie);
    const found = (adminOrders.json?.items ?? []).find((o) => o.orderNumber === created.orderNumber);
    record('Admin sees the new order in the order list', adminOrders.status === 200 && !!found, `status ${adminOrders.status}`);

    if (found?.id) {
      const ship = await api('PATCH', `/admin/orders/${found.id}/shipment`, { carrier: 'DHL', trackingNumber: 'QA-TRACK-1' }, adminCookie);
      record('Admin adds tracking; the order moves to SHIPPED', [200, 201].includes(ship.status) && ship.json?.status === 'SHIPPED', `status ${ship.status} ${JSON.stringify(ship.json).slice(0, 160)}`);
      const shipped = await api('GET', `/orders/${created.orderNumber}?email=${encodeURIComponent(customer.email)}`);
      record('Customer sees the shipment and tracking number', shipped.json?.status === 'SHIPPED' && shipped.json?.shipment?.trackingNumber === 'QA-TRACK-1', JSON.stringify(shipped.json?.shipment));
      record('An illegal status transition is rejected (400)', (await api('PATCH', `/admin/orders/${found.id}/status`, { status: 'PROCESSING' }, adminCookie)).status === 400);
      record('Admin can mark the order DELIVERED', [200, 201].includes((await api('PATCH', `/admin/orders/${found.id}/status`, { status: 'DELIVERED' }, adminCookie)).status));
    }

    record('Admin can search customers', (await api('GET', `/admin/customers?q=${encodeURIComponent(email)}`, undefined, adminCookie)).status === 200);
    const settings = await api('GET', '/admin/settings', undefined, adminCookie);
    record('/admin/settings reports integration status', settings.status === 200 && !!settings.json?.integrations, JSON.stringify(settings.json?.integrations));
    record('Admin can list categories', Array.isArray((await api('GET', '/admin/categories', undefined, adminCookie)).json));
    record('Admin can list discounts', Array.isArray((await api('GET', '/admin/discounts', undefined, adminCookie)).json));

const payload = {
      name: 'QA Temporary Product',
      description: 'Created by the QA harness and deleted again.',
      categoryId: product.categoryId,
      audience: 'UNISEX',
      priceMinor: 1_234_500,
      baseSku: `QA-${Date.now()}`,
      isActive: true,
      images: [{ url: '/products/abaya-black-1.svg', alt: 'QA' }],
      variants: [{ sku: `QA-${Date.now()}-M`, size: 'M', color: 'Black', stock: 3 }],
      attributes: [{ key: 'Fabric', value: 'Test' }],
    };
    const newP = await api('POST', '/admin/products', payload, adminCookie);
    record('Admin can create a product', [200, 201].includes(newP.status) && !!newP.json?.id, `status ${newP.status} ${JSON.stringify(newP.json).slice(0, 200)}`);
    if (newP.json?.id) {
      const edited = await api('PUT', `/admin/products/${newP.json.id}`, { ...payload, name: 'QA Temporary Product (edited)', priceMinor: 999_000, salePriceMinor: 499_000 }, adminCookie);
      record('Admin can edit a product (price + sale price)', [200, 201].includes(edited.status) && edited.json?.currentPriceMinor === 499_000, JSON.stringify({ status: edited.status, current: edited.json?.currentPriceMinor }));
      record('Sale price above the regular price is rejected (400)', (await api('PUT', `/admin/products/${newP.json.id}`, { ...payload, priceMinor: 1000, salePriceMinor: 5000 }, adminCookie)).status === 400);
      const vid = newP.json.variants?.[0]?.id;
      record('Admin can change variant stock (inventory)', vid ? ((await api('PATCH', `/admin/variants/${vid}/stock`, { stock: 42 }, adminCookie)).json?.stock ?? 0) === 42 : false, vid ? '' : 'no variant id returned');
      record('Admin can delete a product', (await api('DELETE', `/admin/products/${newP.json.id}`, undefined, adminCookie)).status === 200);
    } else {
      for (const n of ['Admin can edit a product (price + sale price)', 'Sale price above the regular price is rejected (400)', 'Admin can change variant stock (inventory)', 'Admin can delete a product']) record(n, false, 'skipped: create failed');
    }
  }

  // -------------------------------------------------- cancel + restock safety
  const fresh = await api('POST', '/checkout/orders', { customer, address, shippingMethodId: shipId, items: one, idempotencyKey: `qa-cancel-${Date.now()}` });
  const stockHeld = (await api('GET', `/products/${slug}`)).json.variants.find((v) => v.id === variantId).stock;
  const cancelled = await api('POST', `/orders/${fresh.json.orderNumber}/cancel?email=${encodeURIComponent(customer.email)}`);
  const stockReleased = (await api('GET', `/products/${slug}`)).json.variants.find((v) => v.id === variantId).stock;
  record('Customer can cancel an unpaid order', cancelled.status === 200, `status ${cancelled.status}`);
  record('Cancelling returns the reserved stock', stockReleased === stockHeld + 1, `held ${stockHeld} released ${stockReleased}`);
  record('A cancelled order cannot be paid', [400, 404, 409].includes((await api('POST', `/payments/${fresh.json.orderNumber}/initialize`, { email: customer.email })).status));
  record('API healthy at the end of the run', (await api('GET', '/health')).status === 200);
} catch (e) {
  record('Harness completed without throwing', false, e?.stack || String(e));
} finally {
  finish();
}

/** Adds, lists and removes a wishlist entry for the given session. */
async function wishlistRoundTrip(cookie) {
  const pid = (await api('GET', '/products?limit=1')).json.items[0].id;
  const add = await api('POST', `/account/wishlist/${pid}`, undefined, cookie);
  const list = await api('GET', '/account/wishlist/ids', undefined, cookie);
  const remove = await api('DELETE', `/account/wishlist/${pid}`, undefined, cookie);
  const after = await api('GET', '/account/wishlist/ids', undefined, cookie);
  return add.status === 200 && Array.isArray(list.json) && list.json.includes(pid) && remove.status === 200 && !(after.json ?? []).includes(pid);
}