# Modeza: Islamic Fashion & Lifestyle Store

A full-stack e-commerce platform for modest fashion, kids' wear, accessories, gold jewelry, Arabian perfumes, Islamic books, lifestyle products and prophetic-medicine items.

| Layer | Technology |
|---|---|
| Storefront + admin UI | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons |
| API | NestJS 11, TypeScript, REST, class-validator, Helmet, rate limiting |
| Database | PostgreSQL (Supabase or Neon) via Prisma ORM, migrations + seed |
| Auth | Email/password (bcrypt) and Google OAuth 2.0, HTTP-only cookie sessions, roles (customer/admin) |
| Email | Mailgun transactional email, branded templates, delivery log in the database |
| Payments | Paystack (initialize, server-side verify, signed webhook, refunds) |
| Hosting | Vercel (web) + Render/Railway (API) + Supabase/Neon (database) |

> **Status.** Everything below is built and tested locally. **Nothing is deployed yet and no live third-party account (Google, Mailgun, Paystack, Supabase/Neon, Vercel, Render) has been connected**, because those need your own accounts and secrets. Follow [docs/SETUP-GUIDE.md](docs/SETUP-GUIDE.md) to create them (about 45 minutes); the app then deploys with no code changes.

## What is included

**Storefront**: homepage (announcement bar, hero, categories, new arrivals, best sellers, women/men/kids/perfume/book/medicine sections, Eid/Ramadan collection, promo banners, testimonials from real reviews, newsletter, gallery, footer); mega-menu navigation + accessible mobile menu; product listing with grid/list views, category/subcategory, price, size, colour, brand, availability and rating filters, sorting, pagination, loading/empty/error states; search with live suggestions; product pages with gallery + hover zoom, variants (size/colour), stock status, size guides, book/perfume/honey/jewelry specification tables, reviews (verified buyers only), related and recently viewed products; wishlist (guest and signed-in); cart with server-validated pricing, discount codes, persistence and sync after login; 5-step checkout; order confirmation and tracking.

**Internationalisation**: English and Arabic with full RTL layout; country, language and currency selector (NG, GB, US, SA, AE, GH); preferences persisted (browser + account). Prices are stored and charged in NGN; other currencies are *indicative conversions* using admin-editable rates and are labelled with `~`.

**Customer account**: profile, saved addresses, order history and tracking, wishlist, recently viewed, password management, language/currency preferences, email verification, password reset.

**Admin dashboard** (`/admin`, admin role only): sales chart and KPIs, low-stock alerts, recent transactions; product CRUD with images (URL or upload), variants, inventory, sale prices, featured flags, CSV export; categories/subcategories; orders (search, filter, status workflow, tracking numbers, payment re-verification, cancel, refund); customers (search, orders, promote/demote admins); discount codes (percent/fixed, expiry, usage limit, minimum spend); banners, FAQs, policies; store info, countries/currency/tax, shipping rules, integration status.

**Catalogue seed**: 87 products across every requested category (abayas, prayer dresses, jilbabs, khimars, hijabs, undercaps, niqabs, modest dresses, thobes/jubbas, kaftans, kids boys/girls/matching sets, watches, bags, hijab pins, tasbih, gold vs gold-plated vs gold-tone jewelry with clear material labels, oud/attars/bakhoor/musk/gift sets, Quran/tafsir/hadith/seerah/fiqh/women/kids/Arabic/journals/parenting books, prayer mats, Quran stands, wall decor, gift boxes, Hajj/Umrah kits, black seed, honey, zamzam, khal, oils/herbal).

## Run it locally

Requirements: Node 20+ (tested on Node 26), npm 10+. No Docker needed: a throwaway embedded PostgreSQL is provided.

```bash
npm install

# Terminal 1: local database (first run downloads PostgreSQL binaries)
npm run db:local

# Terminal 2: configure, migrate, seed and start the API
cp apps/api/.env.example apps/api/.env          # PowerShell: Copy-Item
npm run migrate:deploy -w apps/api
npm run seed
npm run dev:api                                  # http://localhost:4000

# Terminal 3: storefront
cp apps/web/.env.example apps/web/.env.local
npm run dev:web                                  # http://localhost:3000
```

Sign in as admin with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env` (defaults `admin@modeza.test` / `ChangeMe123!`, **change them before any real deployment**).

The embedded database defaults to a database named `modeza_dev`. If your `.env` points at a different name, create it first (the script creates `modeza_dev` and `modeza_test_utf8`).

**Without credentials, locally:** payments use a built-in *development gateway* (a "Simulate payment" page) which exists only when `PAYSTACK_SECRET_KEY` is empty **and** `NODE_ENV` is not `production`; Mailgun messages are logged to the `EmailLog` table as `skipped`; Google sign-in shows "not configured". Add the real keys and these switch to the real services automatically.

## Tests

| Suite | Command | Count | Result at hand-over |
|---|---|---|---|
| API unit (Jest) | `npm test` | 8 | all pass |
| API integration (Jest + Supertest, real PostgreSQL) | `npm run test:e2e -w apps/api` | 37 | all pass |
| Browser E2E (Playwright, desktop + mobile) | `npm run test:e2e -w apps/web` (with db, API and web running; once: `npx playwright install chromium`) | 16 | all pass |

Coverage highlights: registration/login/negative logins, forged tokens, email verification and reset (single-use, expiry), Google CSRF state check, catalogue filters/search/sorting, server-side price computation (client prices rejected), discounts (invalid/expired/limit), stock reservation, **concurrent buyers of the last unit (exactly one wins)**, idempotent checkout (double submit), duplicate payment callbacks (processed once), failed payment + retry, webhook signature validation, expired-hold stock release, per-user data isolation, admin authorisation (401/403 on every admin route), order state machine, cancel/refund restocking, product validation, upload type checks, plus browser flows for guest checkout, failed payment, discount codes, wishlist, Arabic/RTL + currency switch, admin product and order management, and mobile navigation/overflow.

## Architecture notes

- `apps/web` proxies `/api/*` to the NestJS API (see `next.config.mjs`). The browser therefore only talks to the storefront origin: the session cookie is first-party (works in Safari), no CORS or cross-site cookie trouble, and the Google OAuth callback lives on the storefront domain.
- **Prices never come from the browser.** The cart only holds `variantId + quantity`; `PricingService` recomputes prices, discount, shipping and tax from the database for every quote and again inside the order transaction.
- **Orders and stock.** An order is created as `PENDING_PAYMENT` and stock is reserved with an atomic conditional `UPDATE ... WHERE stock >= qty`. It becomes `PAID` only after the backend confirms the charge with Paystack (amount and currency must match). Unpaid orders release their stock after 30 minutes (an in-process timer, so use an always-on host). Payment finalisation is idempotent: a conditional update lets only one callback/webhook/verify call win.
- **Security**: Helmet, strict CORS, global validation pipe (whitelist + forbid unknown fields), rate limiting (stricter on auth), bcrypt cost 12, hashed single-use tokens, HTTP-only `SameSite=Lax` cookies (`Secure` in production), role re-checked from the database on every request, generic auth errors, no raw card data, HTML stripped from user text and all output escaped, internal errors never leaked.
- Database: 27 models and 6 enums in `apps/api/prisma/schema.prisma` with foreign keys, unique constraints and indexes; migrations in `apps/api/prisma/migrations`.

## Known limitations (please read)

1. **Product images are generated illustrations**, not photography (they are real local SVG files, so nothing can break). Replace them with your own photos through Admin > Products (URL or upload). The same applies to sample descriptions, prices, brands and suppliers: the seed data is **sample data**. In particular the Zamzam listing is a placeholder, so only sell it if you hold the legal import authorisation and supplier details.
2. Google, Mailgun and Paystack integrations are implemented against their public APIs but have **not been exercised against live accounts** (no credentials were available). Webhook signature verification, the payment state machine, and email templating are tested; the HTTPS calls to Paystack/Mailgun/Google are not. Do a test-mode run (guide section 9) before going live.
3. Uploaded admin images are stored on the API server's disk, which is **ephemeral on Render's free plan**. Prefer image URLs (or add Supabase Storage/S3) for production.
4. Currency conversion uses fixed, admin-edited rates, not a live FX feed; charging is always in NGN.
5. The admin UI is English-only; the storefront is English/Arabic (Arabic product names exist for a subset of seed products).
6. Rate limiting is in memory (single API instance). Add Redis if you scale horizontally.
7. Product import is not implemented (CSV export only).
8. Render's free plan sleeps after inactivity, which delays the first request and pauses the stock-release timer.

## Project layout

```
apps/api   NestJS API (src/*), Prisma schema/migrations/seed (prisma/*), tests (test/*), local DB launcher (scripts/*)
apps/web   Next.js app (src/app/*, src/components/*), Playwright tests (e2e/*)
docs/      SETUP-GUIDE.md: account creation + deployment for every service
render.yaml  Render blueprint for the API
```
