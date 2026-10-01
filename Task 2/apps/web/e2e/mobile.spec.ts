import { expect, test } from '@playwright/test';

test('mobile: hamburger menu with expandable categories, no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: /Women/ }).click();
  await menu.getByRole('link', { name: 'Abayas' }).click();
  await expect(page).toHaveURL(/category=abayas/);
  await expect(page.getByTestId('product-card').first()).toBeVisible();
});

test('mobile: filters open in a drawer; product page and checkout fit the screen', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('button', { name: /Filters/ }).click();
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Close filters' }).click();

  await page.goto('/product/sidr-honey');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByRole('link', { name: 'Checkout' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByLabel('Full name')).toBeVisible();
});
