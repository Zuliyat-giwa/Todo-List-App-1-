import { defineConfig, devices } from '@playwright/test';

/**
 * Browser end-to-end tests run against a locally running stack:
 *   1. npm run db:local      (embedded Postgres)  + npm run seed
 *   2. npm run dev:api       (http://localhost:4000)
 *   3. npm run dev:web       (http://localhost:3000)
 * then:  npm run test:e2e -w apps/web
 * The API must have no PAYSTACK_SECRET_KEY so the built-in development gateway is used.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 900 } }, testIgnore: /mobile.spec.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
});
