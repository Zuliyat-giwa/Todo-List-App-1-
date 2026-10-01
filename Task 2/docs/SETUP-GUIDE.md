# Setup & Deployment Guide (beginner friendly)

Follow the sections in order. At the end you will have the store live on the internet. Keep a private notes file (password manager, **not** the repo) for the secrets you collect. Every secret has a name like `DATABASE_URL`; where to paste it is stated each time.

Order of work: **1 GitHub → 2 Database → 3 Google → 4 Mailgun → 5 Paystack → 6 Render (API) → 7 Vercel (web) → 8 Link everything → 9 Test → 10 Domain**.

You will see two placeholders below: `YOUR-API` (the URL Render gives you, e.g. `https://modeza-api.onrender.com`) and `YOUR-SITE` (the URL Vercel gives you, e.g. `https://modeza.vercel.app`, or your own domain). You will not know them until steps 6 and 7, so some steps are revisited in section 8.

---

## 1. GitHub repository

- Website: https://github.com, sign up at https://github.com/signup
1. Click **+ > New repository**, name it `modeza-store`, choose **Private**, do **not** add a README, click **Create repository**.
2. In a terminal in the project folder: `git remote add origin https://github.com/YOUR-USER/modeza-store.git`, then `git add .`, `git commit -m "Modeza store"`, `git push -u origin main`.
3. Check that no `.env` file was uploaded (they are git-ignored). If a secret is ever pushed by mistake, **rotate it** (create a new one) because deleting the commit is not enough.

> This workspace's git repository root is the folder *above* `Task 2`. Either push that whole repo, or copy `Task 2` into its own repo. On Vercel/Render set the **Root Directory** to wherever `package.json` with `"workspaces"` lives (`Task 2` in the first case, the repo root in the second).

---

## 2. Database: Supabase **or** Neon (pick one)

The app needs **two** connection strings: `DATABASE_URL` (pooled, used by the running app) and `DIRECT_URL` (direct, used by migrations).

### Option A: Supabase
- Website: https://supabase.com, dashboard: https://supabase.com/dashboard
1. **Sign in with GitHub > New project.** Choose an organisation, name `modeza`, set a **Database Password** (save it; avoid special characters or URL-encode them), pick the region nearest your customers, click **Create new project** (takes ~2 minutes).
2. Click **Connect** (top bar). Under **Connection string** you need two tabs:
   - **Transaction pooler** (port `6543`): use for `DATABASE_URL` and append `?pgbouncer=true&connection_limit=1`.
   - **Session pooler** (port `5432`, host like `aws-0-xx.pooler.supabase.com`): use for `DIRECT_URL`. (The plain "Direct connection" host is IPv6-only on some plans and may not work from Render; the session pooler works everywhere.)
3. Replace `[YOUR-PASSWORD]` in both strings with your database password.
- Env vars: `DATABASE_URL`, `DIRECT_URL` (on the API host).

### Option B: Neon
- Website: https://neon.tech, console: https://console.neon.tech
1. **Sign up > Create project**, name `modeza`, choose the nearest region, Postgres 16/17.
2. On the project dashboard click **Connect**. Toggle **Connection pooling ON** and copy the string (host contains `-pooler`): this is `DATABASE_URL`. Toggle it **OFF** and copy again: this is `DIRECT_URL`. Both should end with `?sslmode=require`.
- Env vars: `DATABASE_URL`, `DIRECT_URL`.

**Create the tables and sample data** (do this once, from your computer, after setting the two variables in `apps/api/.env`):

```bash
npm install
npm run migrate:deploy -w apps/api    # creates every table
NODE_ENV=production ADMIN_EMAIL=you@yourmail.com ADMIN_PASSWORD='a-long-unique-password' npm run seed
```
(Windows PowerShell: `$env:NODE_ENV='production'; $env:ADMIN_EMAIL='you@yourmail.com'; $env:ADMIN_PASSWORD='a-long-unique-password'; npm run seed`.)
This creates the categories, 87 sample products, countries, shipping rules, and **your admin account**. The seed refuses to run twice on a database that already has products (set `SEED_FORCE=1` to override: that clears carts, wishlists and reviews).

**Test:** in Supabase *Table Editor* (or Neon *Tables*) you should see `Product`, `Order`, `User`, etc. with rows in `Product`.

---

## 3. Google sign-in (Google Cloud Console)

- Website: https://console.cloud.google.com (sign in with a Google account)
1. Top bar project picker > **New project**, name `Modeza`, **Create**, and select it.
2. Menu **APIs & Services > OAuth consent screen** (or *Google Auth Platform*): click **Get started**, App name `Modeza`, support email = yours, Audience **External**, add your contact email, accept the policy, **Create**.
3. In the consent screen **Data Access** page, **Add or remove scopes**: tick `.../auth/userinfo.email`, `.../auth/userinfo.profile` and `openid` (these are non-sensitive; no Google review is needed). Save.
4. **Audience** page: while status is *Testing*, only emails listed under **Test users** can sign in. Add yours. When ready for the public click **Publish app** (no verification needed for these basic scopes).
5. **APIs & Services > Credentials > + Create credentials > OAuth client ID**, Application type **Web application**, name `Modeza web`.
   - **Authorized JavaScript origins:** `http://localhost:3000` and `https://YOUR-SITE`
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/google/callback` and `https://YOUR-SITE/api/auth/google/callback`
   (the redirect lives on the *storefront* domain because the storefront proxies `/api/*` to the API; it must match exactly, including `https` and no trailing slash.)
6. **Create**, then copy **Client ID** and **Client secret**.
- Env vars (API host): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Optional override: `GOOGLE_CALLBACK_URL` (defaults to `WEB_URL + /api/auth/google/callback`).
- Changes to redirect URIs can take a few minutes to apply. After you get your real URL (section 7/10), come back and add it.

**Test:** open `/login`, click **Continue with Google**. Success: you land on `/account`. Error `redirect_uri_mismatch` means the URI in step 5 differs from `WEB_URL + /api/auth/google/callback`. "Access blocked" means you are not a listed test user yet.

---

## 4. Mailgun (emails)

- Website: https://www.mailgun.com, dashboard: https://app.mailgun.com
1. Sign up (the free tier is enough to start). Verify your email and phone.
2. **Sending > Domains > Add new domain.** Use a subdomain of a domain you own, e.g. `mg.yourdomain.com`. Choose the region (US or EU). Note: the EU region needs `MAILGUN_API_BASE=https://api.eu.mailgun.net`.
3. Mailgun shows DNS records (TXT for SPF and DKIM, optional CNAME for tracking, MX for receiving). Add them at your domain registrar's DNS page, then click **Verify DNS settings** (can take minutes to hours). The status must show *Active*.
   - *No domain yet?* Use the **sandbox domain** Mailgun provides, but it can only send to recipients you add under **Authorized Recipients**, which is fine for testing.
4. API key: click your account name (top right) > **API security** (or *Settings > API Keys*) > **Add new key** (or copy a *Sending key* under the domain). Copy it once; it is shown only at creation.
- Env vars (API host): `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` (e.g. `mg.yourdomain.com`), `MAILGUN_API_BASE` (`https://api.mailgun.net` or the EU one), `MAIL_FROM` (e.g. `Modeza <no-reply@mg.yourdomain.com>`).

**Test:** register a new account on the site. You should receive a *Welcome* and a *Verify your email* message within a minute. Also check Mailgun **Sending > Logs**, and the `EmailLog` table (status `sent`, `failed` with an error, or `skipped` if Mailgun is not configured). The admin *Settings* page shows Mailgun as "Configured". Emails sent by the store: welcome, verification, password reset, order confirmation, payment confirmation, processing, shipped (with tracking), delivered, cancelled, refunded, newsletter confirmation.

---

## 5. Paystack (payments)

- Website: https://paystack.com, dashboard: https://dashboard.paystack.com
1. **Create a free account** and sign in. You start in **Test mode** (toggle at the top). No business verification is needed for test mode.
2. **Settings > API Keys & Webhooks.** Copy the **Test Secret Key** (`sk_test_...`). **Never** put it in frontend code.
3. In the same page set **Test Webhook URL** to `https://YOUR-API/payments/webhook/paystack` (the API's own URL on Render, which receives the raw request body needed for the signature check). Save.
- Env var (API host): `PAYSTACK_SECRET_KEY`.
- Paystack signs webhooks with your secret key; the API rejects any request whose HMAC does not match.

**Test (test mode):** place an order, choose *Pay now*, and on the Paystack page use their test card from https://paystack.com/docs/payments/test-payments (e.g. `4084 0840 8408 4081`, any future expiry, CVV `408`; follow the PIN/OTP prompts shown there). You should return to the order page showing *Payment SUCCESS*, receive confirmation emails, and see the order as **PAID** in Admin > Orders.

**Going live:** complete Paystack's business verification, switch the dashboard to **Live**, copy the **Live Secret Key** (`sk_live_...`) into `PAYSTACK_SECRET_KEY`, and set the **Live Webhook URL** to the same URL as above.

> Paystack charges in NGN here. If you want to charge GBP/USD/etc. you must enable those currencies on your Paystack account and extend the order currency logic first.

---

## 6. Backend hosting: Render (NestJS API)

- Website: https://render.com, dashboard: https://dashboard.render.com
1. Sign up with GitHub. **New + > Blueprint**, pick your repo. Render reads `render.yaml` and proposes a web service called `modeza-api`. (Or create it manually: **New + > Web Service**, runtime Node, **Root Directory** = folder containing the root `package.json`, **Build command** `npm ci --include=dev && npm run build -w apps/api`, **Start command** `npm run migrate:deploy -w apps/api && npm run start -w apps/api`, **Health check path** `/health`, env `NODE_VERSION=22`.)
2. Fill the environment variables (secrets marked `sync: false`):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL`, `DIRECT_URL` | from section 2 |
| `JWT_SECRET` | auto-generated by the blueprint (or run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `API_URL` | `https://YOUR-API` (shown by Render after the first deploy; set it, then redeploy) |
| `WEB_URL` | `https://YOUR-SITE` (from section 7; no trailing slash) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | section 3 |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_API_BASE`, `MAIL_FROM` | section 4 |
| `PAYSTACK_SECRET_KEY` | section 5 |

3. **Create/Deploy.** The start command applies database migrations automatically on every deploy.
4. **Test:** open `https://YOUR-API/health`: it should return `{"ok":true}`, and `https://YOUR-API/products?limit=2` should return JSON products.

Notes: the free plan sleeps after ~15 minutes of inactivity (first request is slow) and its disk is ephemeral. For a real store use a paid always-on instance so the 30-minute unpaid-order stock release keeps running. **Railway** works the same way: same build/start commands and variables.

---

## 7. Frontend hosting: Vercel (Next.js)

- Website: https://vercel.com, dashboard: https://vercel.com/dashboard
1. Sign up with GitHub > **Add New > Project** > import the repo.
2. **Root Directory:** `apps/web` (include the `Task 2/` prefix if your repo root is the parent folder). Enable **"Include source files outside of the Root Directory"**. Framework preset: **Next.js** (auto-detected).
3. **Environment Variables:**
   - `API_URL` = `https://YOUR-API` (no trailing slash). The storefront proxies `/api/*` and `/uploads/*` to it. It is read at build time, so changing it requires a redeploy.
   - `NEXT_PUBLIC_SITE_URL` = `https://YOUR-SITE`.
4. **Deploy.** Vercel gives you `https://something.vercel.app`: this is `YOUR-SITE`.
5. **Test:** open the site; the homepage should show products (they come from the API/database).

---

## 8. Link the services together (after you know both URLs)

1. Render > API service > Environment: set `WEB_URL=https://YOUR-SITE` and `API_URL=https://YOUR-API`, then redeploy.
2. Google Cloud > Credentials > your OAuth client: add `https://YOUR-SITE` as an origin and `https://YOUR-SITE/api/auth/google/callback` as a redirect URI.
3. Paystack > Settings > Webhook URL: `https://YOUR-API/payments/webhook/paystack`.
4. Vercel: confirm `API_URL` is the final Render URL (redeploy if you changed it).
5. Mailgun needs nothing else; links inside emails use `WEB_URL`.

---

## 9. Verify everything (checklist)

Run these on the live site, in Paystack **test mode** first:
- [ ] Homepage loads with products; switch language to Arabic (page flips right-to-left) and currency to USD (prices show `~`).
- [ ] Register a customer; welcome + verification emails arrive; the verification link works; *Forgot password* email arrives and the reset link works.
- [ ] **Continue with Google** signs in.
- [ ] Add a product to the cart, apply `WELCOME10`, check out, pay with a Paystack test card; the order page shows **PAID**; confirmation + payment emails arrive.
- [ ] Reload the browser during checkout: no duplicate order appears in *Admin > Orders*.
- [ ] Sign in as the admin (the `ADMIN_EMAIL` you seeded): Admin shows the order; mark it *Processing*, add a tracking number (shipping email arrives), mark *Delivered*; try *Refund*.
- [ ] A normal customer visiting `/admin` sees "Access denied".
- [ ] Open the site on your phone: menu, filters and checkout fit the screen.
- [ ] Supabase/Neon table viewer shows your new `User`, `Order`, `Payment`, `EmailLog` rows (proof of persistence).

---

## 10. Custom domain (optional)

1. Buy a domain from any registrar (Namecheap, GoDaddy, Cloudflare...).
2. Vercel > Project > **Settings > Domains > Add** `www.yourdomain.com` (and the apex). Vercel shows DNS records (usually `A 76.76.21.21` for the apex and `CNAME cname.vercel-dns.com` for `www`); add them at your registrar.
3. Once the domain is active, treat it as the new `YOUR-SITE`: update `WEB_URL` (Render), the Google origin + redirect URI, and `NEXT_PUBLIC_SITE_URL` (Vercel), then redeploy both.
4. For Mailgun, a subdomain such as `mg.yourdomain.com` is separate; add its DNS records at the same registrar.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Site shows no products / "We could not load products" | Vercel `API_URL` wrong or the Render service is asleep/failed. Open `YOUR-API/health`. |
| Login works but you are logged out on refresh | Vercel `API_URL` points straight at a different domain than the one you browse. Browse via the Vercel site, not the Render URL. |
| Google `redirect_uri_mismatch` | Redirect URI in Google must exactly equal `WEB_URL/api/auth/google/callback`. |
| Prisma error `P1001` / cannot reach database | Wrong connection string; for Supabase use the **pooler** strings; check password encoding. |
| Migration fails with "prepared statement already exists" | `DATABASE_URL` must have `?pgbouncer=true`; migrations must use `DIRECT_URL`. |
| Payments page says "Payments are not configured" | `PAYSTACK_SECRET_KEY` is missing on the API host (production never uses the fake gateway). |
| Paid but order still pending | Webhook URL wrong. The order page and Admin > *Verify payment* also re-check with Paystack. |
| Emails not arriving | Check `EmailLog` (status/error), Mailgun *Logs*, sandbox authorised recipients, DNS verification, EU/US `MAILGUN_API_BASE`. |
