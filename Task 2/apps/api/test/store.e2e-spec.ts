import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Modeza API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let orders: OrdersService;
  const run = Date.now().toString(36);
  const ids: Record<string, string> = {};
  const address = { country: 'NG', state: 'Lagos', city: 'Ikeja', street: '12 Allen Avenue' };
  const customer = { name: 'Test Buyer', email: `buyer-${run}@example.com`, phone: '+2348012345678' };

  const checkout = (items: { variantId: string; quantity: number }[], extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post('/checkout/orders').send({ customer, address, shippingMethodId: ids.ship, items, ...extra });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    orders = app.get(OrdersService);
    http = request(app.getHttpServer()) as any;

    // ---- fixtures
    await prisma.supportedCountry.upsert({ where: { code: 'NG' }, create: { code: 'NG', name: 'Nigeria', language: 'en', currency: 'NGN', taxPercent: 10 }, update: { taxPercent: 10, isActive: true } });
    const ship = await prisma.shippingMethod.create({ data: { name: `Std ${run}`, priceMinor: 350000, freeOverMinor: 10000000, minDays: 3, maxDays: 7 } });
    ids.ship = ship.id;
    const cat = await prisma.category.create({ data: { name: `Cat ${run}`, slug: `cat-${run}` } });
    ids.cat = cat.id;
    const product = await prisma.product.create({
      data: {
        name: `Test Abaya ${run}`, slug: `test-abaya-${run}`, description: 'A test abaya for e2e', categoryId: cat.id, audience: 'WOMEN', brand: 'TestBrand', priceMinor: 5000000, salePriceMinor: 4000000, currentPriceMinor: 4000000,
        baseSku: `T-${run}`, isActive: true,
        images: { create: [{ url: '/x.svg', sortOrder: 0 }] },
        variants: { create: [{ sku: `T-${run}-A`, size: 'M', color: 'Black', stock: 5 }, { sku: `T-${run}-B`, size: 'L', color: 'Black', stock: 0 }, { sku: `T-${run}-C`, size: 'S', color: 'Black', stock: 1 }] },
      },
      include: { variants: true },
    });
    ids.product = product.id;
    ids.slug = product.slug;
    ids.vM = product.variants.find((v) => v.size === 'M')!.id;
    ids.vL = product.variants.find((v) => v.size === 'L')!.id;
    ids.vS = product.variants.find((v) => v.size === 'S')!.id;
    await prisma.discountCode.create({ data: { code: `TEN${run}`.toUpperCase(), type: 'PERCENT', value: 10, minPurchaseMinor: 0 } });
    await prisma.discountCode.create({ data: { code: `GONE${run}`.toUpperCase(), type: 'PERCENT', value: 10, expiresAt: new Date(Date.now() - 1000) } });
    await prisma.user.create({ data: { email: `admin-${run}@example.com`, name: 'Admin', role: 'ADMIN', emailVerified: true, passwordHash: await bcrypt.hash('AdminPass123', 4) } });
  });

  afterAll(async () => {
    await app.close();
  });

  const stock = async (id: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;
  const agent = () => request.agent(app.getHttpServer());

  // ------------------------------------------------------------------ auth
  describe('authentication', () => {
    const email = `user-${run}@example.com`;
    it('registers, sets an HttpOnly session cookie and returns the user', async () => {
      const a = agent();
      const res = await a.post('/auth/register').send({ name: 'Ada Lovelace', email, password: 'Password123' }).expect(201);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
      const me = await a.get('/auth/me').expect(200);
      expect(me.body.user.email).toBe(email);
    });
    it('rejects duplicate registration and weak passwords', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({ name: 'Ada', email, password: 'Password123' }).expect(400);
      await request(app.getHttpServer()).post('/auth/register').send({ name: 'Bob', email: `b-${run}@example.com`, password: 'short' }).expect(400);
    });
    it('rejects invalid credentials with a generic message', async () => {
      const bad = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password' }).expect(401);
      const none = await request(app.getHttpServer()).post('/auth/login').send({ email: 'nobody@example.com', password: 'whatever12' }).expect(401);
      expect(bad.body.message).toBe(none.body.message);
    });
    it('treats /auth/me as anonymous without a session and ignores forged tokens', async () => {
      const r = await request(app.getHttpServer()).get('/auth/me').expect(200);
      expect(r.body.user).toBeNull();
      await request(app.getHttpServer()).get('/orders').set('Authorization', 'Bearer not.a.token').expect(401);
    });
    it('forgot-password never reveals whether an email exists', async () => {
      const a = await request(app.getHttpServer()).post('/auth/forgot-password').send({ email }).expect(200);
      const b = await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: 'ghost@example.com' }).expect(200);
      expect(a.body).toEqual(b.body);
    });
    it('verifies email and resets password with single-use tokens', async () => {
      const { newToken } = await import('../src/common/util');
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      const v = newToken();
      await prisma.verificationToken.create({ data: { userId: user.id, type: 'EMAIL_VERIFY', tokenHash: v.hash, expiresAt: new Date(Date.now() + 60000) } });
      await request(app.getHttpServer()).post('/auth/verify-email').send({ token: v.raw }).expect(200);
      await request(app.getHttpServer()).post('/auth/verify-email').send({ token: v.raw }).expect(400); // reuse
      const r = newToken();
      await prisma.verificationToken.create({ data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: r.hash, expiresAt: new Date(Date.now() + 60000) } });
      await request(app.getHttpServer()).post('/auth/reset-password').send({ token: r.raw, password: 'NewPassword456' }).expect(200);
      await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'NewPassword456' }).expect(200);
      const expired = newToken();
      await prisma.verificationToken.create({ data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: expired.hash, expiresAt: new Date(Date.now() - 1000) } });
      await request(app.getHttpServer()).post('/auth/reset-password').send({ token: expired.raw, password: 'Another12345' }).expect(400);
    });
    it('Google sign-in reports a clear error when OAuth is not configured', async () => {
      const r = await request(app.getHttpServer()).get('/auth/google').expect(503);
      expect(r.body.message).toMatch(/not configured/i);
    });
    it('Google callback rejects a missing/forged state (CSRF protection)', async () => {
      const r = await request(app.getHttpServer()).get('/auth/google/callback?code=abc&state=forged').expect(302);
      expect(r.headers.location).toContain('google_state');
    });
  });

  // --------------------------------------------------------------- catalogue
  describe('catalogue', () => {
    it('lists, searches, filters and sorts products', async () => {
      const list = await request(app.getHttpServer()).get(`/products?category=cat-${run}`).expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.items[0].onSale).toBe(true);
      expect((await request(app.getHttpServer()).get(`/products?q=${encodeURIComponent('Test Abaya ' + run)}`).expect(200)).body.total).toBe(1);
      expect((await request(app.getHttpServer()).get(`/products?category=cat-${run}&minPrice=9000000`).expect(200)).body.total).toBe(0);
      expect((await request(app.getHttpServer()).get(`/products?category=cat-${run}&size=M&inStock=true`).expect(200)).body.total).toBe(1);
      expect((await request(app.getHttpServer()).get(`/products?category=cat-${run}&size=L&inStock=true`).expect(200)).body.total).toBe(0);
      await request(app.getHttpServer()).get('/products?sort=price_desc&limit=5').expect(200);
    });
    it('returns 404 for unknown products and an empty list for unknown categories', async () => {
      await request(app.getHttpServer()).get('/products/does-not-exist').expect(404);
      expect((await request(app.getHttpServer()).get('/products?category=nope').expect(200)).body.total).toBe(0);
    });
    it('rejects invalid audience filters', async () => {
      await request(app.getHttpServer()).get('/products?audience=ALIENS').expect(400);
    });
    it('returns the product with variants and related items', async () => {
      const r = await request(app.getHttpServer()).get(`/products/${ids.slug}`).expect(200);
      expect(r.body.variants).toHaveLength(3);
      expect(r.body.inStock).toBe(true);
    });
  });

  // ------------------------------------------------------------ cart + quote
  describe('cart pricing', () => {
    it('computes totals on the server: sale price, discount, tax', async () => {
      const r = await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vM, quantity: 2 }], code: `ten${run}`, country: 'NG', shippingMethodId: ids.ship }).expect(200);
      expect(r.body.subtotalMinor).toBe(8000000);
      expect(r.body.discountMinor).toBe(800000);
      expect(r.body.taxMinor).toBe(720000); // 10% of 7,200,000
      expect(r.body.shippingMinor).toBe(350000);
      expect(r.body.totalMinor).toBe(7200000 + 720000 + 350000);
      expect(r.body.valid).toBe(true);
    });
    it('ignores any client-supplied prices', async () => {
      const r = await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vM, quantity: 1, priceMinor: 1 }] }).expect(400); // forbidNonWhitelisted
      expect(r.body.message.join ? r.body.message.join(' ') : r.body.message).toMatch(/priceMinor/);
    });
    it('flags out-of-stock and limited stock', async () => {
      const r = await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vL, quantity: 1 }, { variantId: ids.vS, quantity: 3 }] }).expect(200);
      expect(r.body.lines.find((l: any) => l.variantId === ids.vL).issue).toBe('OUT_OF_STOCK');
      expect(r.body.lines.find((l: any) => l.variantId === ids.vS).issue).toBe('LIMITED_STOCK');
      expect(r.body.valid).toBe(false);
    });
    it('reports invalid and expired discount codes without failing the quote', async () => {
      const bad = await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vM, quantity: 1 }], code: 'NOPE' }).expect(200);
      expect(bad.body.discountError).toMatch(/not valid/i);
      expect(bad.body.discountMinor).toBe(0);
      const old = await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vM, quantity: 1 }], code: `GONE${run}` }).expect(200);
      expect(old.body.discountError).toMatch(/expired/i);
    });
    it('rejects unknown variants, bad quantities and oversized carts', async () => {
      await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: 'invalid-id', quantity: 1 }] }).expect(400);
      await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vM, quantity: 0 }] }).expect(400);
      await request(app.getHttpServer()).post('/cart/quote').send({ items: [{ variantId: ids.vM, quantity: 1000 }] }).expect(400);
    });
    it('returns an empty quote for an empty cart', async () => {
      const r = await request(app.getHttpServer()).post('/cart/quote').send({ items: [] }).expect(200);
      expect(r.body.lines).toEqual([]);
    });
    it('requires sign-in to sync a server cart, and syncs per user', async () => {
      await request(app.getHttpServer()).get('/cart').expect(401);
      const a = agent();
      await a.post('/auth/register').send({ name: 'Cart User', email: `cart-${run}@example.com`, password: 'Password123' }).expect(201);
      await a.put('/cart').send({ items: [{ variantId: ids.vM, quantity: 2 }, { variantId: ids.vM, quantity: 1 }] }).expect(200);
      const r = await a.get('/cart').expect(200);
      expect(r.body.items).toEqual([{ variantId: ids.vM, quantity: 3 }]);
    });
  });

  // ---------------------------------------------------------------- checkout
  describe('checkout and payment', () => {
    it('validates the checkout form (missing shipping information)', async () => {
      await request(app.getHttpServer()).post('/checkout/orders').send({ customer, shippingMethodId: ids.ship, items: [{ variantId: ids.vM, quantity: 1 }] }).expect(400);
      const r = await request(app.getHttpServer()).post('/checkout/orders').send({ customer: { ...customer, email: 'not-an-email' }, address, shippingMethodId: ids.ship, items: [{ variantId: ids.vM, quantity: 1 }] }).expect(400);
      expect(JSON.stringify(r.body.message)).toMatch(/email/);
    });
    it('rejects an empty cart, out-of-stock items and unsupported destinations', async () => {
      await checkout([]).expect(400);
      await checkout([{ variantId: ids.vL, quantity: 1 }]).expect(409);
      await request(app.getHttpServer()).post('/checkout/orders').send({ customer, address: { ...address, country: 'ZZ' }, shippingMethodId: ids.ship, items: [{ variantId: ids.vM, quantity: 1 }] }).expect(400);
    });
    it('reserves stock, is idempotent, and completes the full payment flow exactly once', async () => {
      const before = await stock(ids.vM);
      const key = `idem-${run}`;
      const [r1, r2] = await Promise.all([checkout([{ variantId: ids.vM, quantity: 2 }], { idempotencyKey: key }), checkout([{ variantId: ids.vM, quantity: 2 }], { idempotencyKey: key })]);
      expect([r1.status, r2.status]).toEqual([201, 201]);
      expect(r1.body.orderNumber).toBe(r2.body.orderNumber); // concurrent duplicate submits => one order
      const order = r1.body;
      expect(order.status).toBe('PENDING_PAYMENT');
      expect(order.totalMinor).toBe(8000000 + 800000 * 0 + 350000 + 800000); // 2 x 40,000 + tax 10% + shipping
      expect(await stock(ids.vM)).toBe(before - 2); // reserved once

      const init = await request(app.getHttpServer()).post(`/payments/${order.orderNumber}/initialize`).send({ email: customer.email }).expect(200);
      expect(init.body.authorizationUrl).toContain('/checkout/mock-pay');

      // wrong email cannot start a payment for someone else's order
      await request(app.getHttpServer()).post(`/payments/${order.orderNumber}/initialize`).send({ email: 'attacker@example.com' }).expect(404);

      await request(app.getHttpServer()).post('/payments/dev/complete').send({ reference: init.body.reference, outcome: 'success' }).expect(200);
      // duplicate callbacks
      await request(app.getHttpServer()).post('/payments/dev/complete').send({ reference: init.body.reference, outcome: 'success' }).expect(200);
      await request(app.getHttpServer()).get(`/payments/verify?reference=${init.body.reference}`).expect(200);

      const paid = await prisma.order.findUniqueOrThrow({ where: { orderNumber: order.orderNumber }, include: { payments: true, items: true } });
      expect(paid.status).toBe('PAID');
      expect(paid.payments.filter((p) => p.status === 'SUCCESS')).toHaveLength(1);
      const p = await prisma.product.findUniqueOrThrow({ where: { id: ids.product } });
      expect(p.soldCount).toBe(2); // counted once despite repeated callbacks
      const logs = await prisma.emailLog.findMany({ where: { to: customer.email, template: 'order-confirmation' } });
      expect(logs).toHaveLength(1); // one confirmation email
      // cannot pay twice
      await request(app.getHttpServer()).post(`/payments/${order.orderNumber}/initialize`).send({ email: customer.email }).expect(409);
      // guests can track by number + email only
      await request(app.getHttpServer()).get(`/orders/${order.orderNumber}?email=${customer.email}`).expect(200);
      await request(app.getHttpServer()).get(`/orders/${order.orderNumber}`).expect(404);
      await request(app.getHttpServer()).get(`/orders/${order.orderNumber}?email=other@example.com`).expect(404);
      ids.paidOrder = paid.id;
      ids.paidOrderNo = order.orderNumber;
    });
    it('does not oversell under concurrent checkouts of the last unit', async () => {
      // vS has exactly 1 unit
      const results = await Promise.all(Array.from({ length: 5 }, () => checkout([{ variantId: ids.vS, quantity: 1 }])));
      const codes = results.map((r) => r.status).sort();
      expect(codes.filter((c) => c === 201)).toHaveLength(1);
      expect(codes.filter((c) => c === 409)).toHaveLength(4);
      expect(await stock(ids.vS)).toBe(0);
    });
    it('handles failed payments and lets the customer retry', async () => {
      const order = (await checkout([{ variantId: ids.vM, quantity: 1 }]).expect(201)).body;
      const first = await request(app.getHttpServer()).post(`/payments/${order.orderNumber}/initialize`).send({ email: customer.email }).expect(200);
      await request(app.getHttpServer()).post('/payments/dev/complete').send({ reference: first.body.reference, outcome: 'failed' }).expect(200);
      expect((await prisma.payment.findUniqueOrThrow({ where: { reference: first.body.reference } })).status).toBe('FAILED');
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING_PAYMENT');
      const retry = await request(app.getHttpServer()).post(`/payments/${order.orderNumber}/initialize`).send({ email: customer.email }).expect(200);
      expect(retry.body.reference).not.toBe(first.body.reference);
    });
    it('releases stock and discount usage for unpaid orders after the hold expires', async () => {
      const code = `TEN${run}`.toUpperCase();
      const before = await stock(ids.vM);
      const usedBefore = (await prisma.discountCode.findUniqueOrThrow({ where: { code } })).usedCount;
      const order = (await checkout([{ variantId: ids.vM, quantity: 1 }], { discountCode: code }).expect(201)).body;
      expect(await stock(ids.vM)).toBe(before - 1);
      expect((await prisma.discountCode.findUniqueOrThrow({ where: { code } })).usedCount).toBe(usedBefore + 1);
      await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
      expect(await orders.releaseExpired()).toBeGreaterThanOrEqual(1);
      expect(await stock(ids.vM)).toBe(before);
      expect((await prisma.discountCode.findUniqueOrThrow({ where: { code } })).usedCount).toBe(usedBefore);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CANCELLED');
      await orders.releaseExpired(); // idempotent
      expect(await stock(ids.vM)).toBe(before);
    });
    it('enforces discount usage limits at order time', async () => {
      const code = `ONCE${run}`.toUpperCase();
      await prisma.discountCode.create({ data: { code, type: 'FIXED', value: 100000, usageLimit: 1 } });
      await checkout([{ variantId: ids.vM, quantity: 1 }], { discountCode: code }).expect(201);
      const r = await checkout([{ variantId: ids.vM, quantity: 1 }], { discountCode: code }).expect(400);
      expect(r.body.message).toMatch(/usage limit/i);
    });
    it('Paystack webhook rejects missing or forged signatures and accepts valid ones', async () => {
      const body = JSON.stringify({ event: 'charge.success', data: { reference: 'unknown-ref' } });
      await request(app.getHttpServer()).post('/payments/webhook/paystack').set('Content-Type', 'application/json').send(body).expect(403);
      process.env.PAYSTACK_SECRET_KEY = 'sk_test_secret';
      try {
        await request(app.getHttpServer()).post('/payments/webhook/paystack').set('Content-Type', 'application/json').set('x-paystack-signature', 'bad').send(body).expect(403);
        const sig = createHmac('sha512', 'sk_test_secret').update(body).digest('hex');
        await request(app.getHttpServer()).post('/payments/webhook/paystack').set('Content-Type', 'application/json').set('x-paystack-signature', sig).send(body).expect(200);
      } finally {
        process.env.PAYSTACK_SECRET_KEY = '';
      }
    });
  });

  // -------------------------------------------------------------- customer data
  describe('customer data isolation', () => {
    it('lets users manage only their own addresses and orders', async () => {
      const a = agent();
      const b = agent();
      await a.post('/auth/register').send({ name: 'Alice', email: `alice-${run}@example.com`, password: 'Password123' }).expect(201);
      await b.post('/auth/register').send({ name: 'Bob', email: `bob-${run}@example.com`, password: 'Password123' }).expect(201);
      const addr = (await a.post('/account/addresses').send({ fullName: 'Alice', phone: '+2348000000001', ...address }).expect(201)).body;
      expect(addr.isDefault).toBe(true);
      await b.put(`/account/addresses/${addr.id}`).send({ fullName: 'Hacked', phone: '+2348000000002', ...address }).expect(404);
      await b.delete(`/account/addresses/${addr.id}`).expect(404);
      expect((await b.get('/account/addresses').expect(200)).body).toHaveLength(0);

      const order = (await a.post('/checkout/orders').send({ customer, address, shippingMethodId: ids.ship, items: [{ variantId: ids.vM, quantity: 1 }] }).expect(201)).body;
      expect((await a.get('/orders').expect(200)).body.map((o: any) => o.orderNumber)).toContain(order.orderNumber);
      expect((await b.get('/orders').expect(200)).body).toHaveLength(0);
      await b.get(`/orders/${order.orderNumber}`).expect(404);
      await a.get(`/orders/${order.orderNumber}`).expect(200);
    });
    it('wishlist add/remove works and is per user', async () => {
      const a = agent();
      await a.post('/auth/register').send({ name: 'Wish', email: `wish-${run}@example.com`, password: 'Password123' }).expect(201);
      await a.post(`/account/wishlist/${ids.product}`).expect(200);
      await a.post(`/account/wishlist/${ids.product}`).expect(200); // idempotent
      expect((await a.get('/account/wishlist/ids').expect(200)).body).toEqual([ids.product]);
      await a.delete(`/account/wishlist/${ids.product}`).expect(200);
      expect((await a.get('/account/wishlist/ids').expect(200)).body).toEqual([]);
      await a.post('/account/wishlist/invalid-id').expect(404);
    });
    it('only buyers can review a product', async () => {
      const a = agent();
      await a.post('/auth/register').send({ name: 'Rev', email: `rev-${run}@example.com`, password: 'Password123' }).expect(201);
      await a.post(`/products/${ids.product}/reviews`).send({ rating: 5, body: 'Lovely' }).expect(400);
      await a.post(`/products/${ids.product}/reviews`).send({ rating: 9, body: 'Lovely' }).expect(400);
    });
  });

  // ------------------------------------------------------------------- admin
  describe('admin', () => {
    let admin: ReturnType<typeof request.agent>;
    beforeAll(async () => {
      admin = agent();
      await prisma.productVariant.update({ where: { id: ids.vM }, data: { stock: 50 } }); // earlier tests reserved the fixture stock
      await admin.post('/auth/login').send({ email: `admin-${run}@example.com`, password: 'AdminPass123' }).expect(200);
    });
    it('blocks anonymous users (401) and customers (403) from every admin route', async () => {
      await request(app.getHttpServer()).get('/admin/stats').expect(401);
      await request(app.getHttpServer()).get('/admin/orders').expect(401);
      const c = agent();
      await c.post('/auth/register').send({ name: 'Normal', email: `normal-${run}@example.com`, password: 'Password123' }).expect(201);
      for (const path of ['/admin/stats', '/admin/products', '/admin/orders', '/admin/customers', '/admin/discounts', '/admin/settings']) await c.get(path).expect(403);
      await c.post('/admin/products').send({}).expect(403);
      await c.patch('/admin/customers/x/role').send({ role: 'ADMIN' }).expect(403);
    });
    it('shows dashboard statistics', async () => {
      const r = await admin.get('/admin/stats').expect(200);
      expect(r.body.totalOrders).toBeGreaterThan(0);
      expect(r.body.salesByDay).toHaveLength(30);
      expect(r.body.totalSalesMinor).toBeGreaterThan(0);
    });
    it('creates, edits and deletes products with validation', async () => {
      const body = {
        name: `Admin Product ${run}`, description: 'Created by admin test', categoryId: ids.cat, audience: 'UNISEX', priceMinor: 1000000, baseSku: `AP-${run}`,
        images: [{ url: '/a.svg' }], variants: [{ sku: `AP-${run}-1`, size: 'M', stock: 3 }],
      };
      await admin.post('/admin/products').send({ ...body, salePriceMinor: 2000000 }).expect(400); // sale >= price
      await admin.post('/admin/products').send({ ...body, variants: [{ sku: 'x1', stock: 1 }, { sku: 'x1', stock: 1 }] }).expect(400); // duplicate SKUs
      await admin.post('/admin/products').send({ ...body, priceMinor: -5 }).expect(400);
      const created = (await admin.post('/admin/products').send({ ...body, salePriceMinor: 800000 }).expect(201)).body;
      expect(created.currentPriceMinor).toBe(800000);
      expect(created.slug).toContain('admin-product');
      await admin.put(`/admin/products/${created.id}`).send({ ...body, name: `Admin Product Renamed ${run}`, variants: [{ id: created.variants[0].id, sku: `AP-${run}-1`, size: 'M', stock: 9 }] }).expect(200);
      expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: created.variants[0].id } })).stock).toBe(9);
      expect((await admin.delete(`/admin/products/${created.id}`).expect(200)).body.archived).toBe(false);
      // products with order history are archived, not deleted
      expect((await admin.delete(`/admin/products/${ids.product}`).expect(200)).body.archived).toBe(true);
      await prisma.product.update({ where: { id: ids.product }, data: { isActive: true } });
    });
    it('moves orders through valid transitions only, with tracking, and cancels/refunds', async () => {
      await admin.patch(`/admin/orders/${ids.paidOrder}/status`).send({ status: 'DELIVERED' }).expect(400); // cannot skip
      await admin.patch(`/admin/orders/${ids.paidOrder}/status`).send({ status: 'bogus' }).expect(400);
      await admin.patch(`/admin/orders/${ids.paidOrder}/status`).send({ status: 'PROCESSING' }).expect(200);
      await admin.patch(`/admin/orders/${ids.paidOrder}/shipment`).send({ carrier: 'DHL', trackingNumber: 'DHL12345' }).expect(200);
      const shipped = (await admin.get(`/admin/orders/${ids.paidOrder}`).expect(200)).body;
      expect(shipped.status).toBe('SHIPPED');
      expect(shipped.shipment.trackingNumber).toBe('DHL12345');
      await admin.post(`/orders/${ids.paidOrderNo}/cancel?email=${customer.email}`).expect(403); // paid orders: staff only
      await admin.patch(`/admin/orders/${ids.paidOrder}/status`).send({ status: 'CANCELLED' }).expect(400); // already shipped
      await admin.patch(`/admin/orders/${ids.paidOrder}/status`).send({ status: 'DELIVERED' }).expect(200);
      expect(await prisma.emailLog.count({ where: { to: customer.email, template: 'order-shipped' } })).toBe(1);
      const refunded = (await admin.post(`/admin/orders/${ids.paidOrder}/refund`).expect(200)).body;
      expect(refunded.status).toBe('REFUNDED');
      expect(refunded.payment.status).toBe('REFUNDED');
    });
    it('cancelling a paid order restocks it', async () => {
      const before = await stock(ids.vM);
      const order = (await checkout([{ variantId: ids.vM, quantity: 1 }]).expect(201)).body;
      const init = (await request(app.getHttpServer()).post(`/payments/${order.orderNumber}/initialize`).send({ email: customer.email }).expect(200)).body;
      await request(app.getHttpServer()).post('/payments/dev/complete').send({ reference: init.reference, outcome: 'success' }).expect(200);
      expect(await stock(ids.vM)).toBe(before - 1);
      await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'CANCELLED' }).expect(200);
      expect(await stock(ids.vM)).toBe(before);
    });
    it('manages discount codes and roles safely', async () => {
      const code = `NEW${run}`.toUpperCase();
      await admin.post('/admin/discounts').send({ code, type: 'PERCENT', value: 150 }).expect(400);
      await admin.post('/admin/discounts').send({ code, type: 'PERCENT', value: 15, minPurchaseMinor: 100000, usageLimit: 3 }).expect(201);
      await admin.post('/admin/discounts').send({ code, type: 'PERCENT', value: 15 }).expect(409);
      const me = (await admin.get('/auth/me')).body.user;
      await admin.patch(`/admin/customers/${me.id}/role`).send({ role: 'CUSTOMER' }).expect(400); // cannot demote self
    });
    it('rejects non-image uploads', async () => {
      await admin.post('/admin/upload').attach('file', Buffer.from('not an image'), { filename: 'x.txt', contentType: 'text/plain' }).expect(400);
    });
  });
});
