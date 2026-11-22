import AxeBuilder from '@axe-core/playwright';
import { product } from '@mustafa/db/schema';
import type { Page } from '@playwright/test';
import { eq } from 'drizzle-orm';

import { ADMIN_URL } from '../support/admin';
import { AFTER_SIGN_IN, expect, test } from '../support/users';

// docs/testing-qa.md: every page template, zero serious or critical violations of WCAG 2.2 AA.
// Add each new page template here.
const PAGES = [
  { name: 'storefront home', url: 'http://localhost:3000/' },
  { name: 'all suits', url: 'http://localhost:3000/shop' },
  { name: 'all suits, filtered', url: 'http://localhost:3000/shop?design=embroidered' },
  { name: 'collection', url: 'http://localhost:3000/collections/dhanak' },
  { name: 'about', url: 'http://localhost:3000/about' },
  { name: 'contact', url: 'http://localhost:3000/contact' },
  { name: 'how to order', url: 'http://localhost:3000/how-to-order' },
  { name: 'faq', url: 'http://localhost:3000/faq' },
  { name: 'privacy', url: 'http://localhost:3000/privacy' },
  { name: 'terms', url: 'http://localhost:3000/terms' },
  { name: 'not found', url: 'http://localhost:3000/no-such-page' },
  { name: 'login', url: 'http://localhost:3000/login' },
  { name: 'register', url: 'http://localhost:3000/register' },
  { name: 'forgot password', url: 'http://localhost:3000/forgot-password' },
  { name: 'reset password', url: 'http://localhost:3000/reset-password?token=x' },
  { name: 'reset password, expired link', url: 'http://localhost:3000/reset-password' },
  { name: 'admin login', url: 'http://localhost:3001/login' },
  { name: 'admin 2FA code', url: 'http://localhost:3001/login/verify' },
];

async function seriousViolations(page: Page) {
  // Let the entrance motion finish first (the headline rise, the scroll reveals): measured
  // mid-fade, text is partly transparent and fails contrast though it passes once shown.
  // Endless decoration (the flower sway) is left running.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(150);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`);
}

for (const { name, url } of PAGES) {
  test(`${name} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(url);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test('a suit page with a video, and its open menu and zoom, have no serious violations', async ({
  page,
  db,
}) => {
  const [suit] = await db
    .select({ slug: product.slug })
    .from(product)
    .where(eq(product.designCode, 'E2E-02'));
  await page.goto(`/products/${suit!.slug}`);
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole('button', { name: /^Zoom photo 1/ }).click();
  expect(await seriousViolations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  // The side panel is for phones and tablets (from 1024px the links sit in the navbar).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

// Phase 3 review: the session-only pages, through the E2E user fixture.
test('the signed-in account page has no serious violations', async ({ page, users }) => {
  const customer = await users.create();
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(customer.email);
  await page.getByLabel('Password').fill(customer.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/account$/, AFTER_SIGN_IN);
  expect(await seriousViolations(page)).toEqual([]);
});

test('admin 2FA setup, both the password step and the QR code step, has no serious violations', async ({
  page,
  users,
}) => {
  const admin = await users.create({ role: 'admin' });
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByRole('textbox', { name: 'Email' }).fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/setup-2fa$/, AFTER_SIGN_IN);
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByLabel('Your password').fill(admin.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('totp-secret')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});
