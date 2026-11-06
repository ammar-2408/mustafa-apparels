import { product } from '@mustafa/db/schema';
import type { Page } from '@playwright/test';
import { eq } from 'drizzle-orm';

import { expect, test } from '../support/users';

// docs/testing-qa.md, responsive: no page scrolls sideways at any device width, nor at 320px,
// the narrowest phone we support (docs/design.md §2).
const TEMPLATES = [
  '/',
  '/shop',
  '/shop?design=embroidered',
  '/collections/khaddar',
  '/search?q=dhanak',
  '/about',
  '/contact',
  '/how-to-order',
  '/faq',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/no-such-page',
];

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test('no storefront template scrolls sideways at this device width', async ({ page, db }) => {
  test.setTimeout(120_000);
  const [suit] = await db
    .select({ slug: product.slug })
    .from(product)
    .where(eq(product.designCode, 'E2E-02'));
  for (const path of [...TEMPLATES, `/products/${suit!.slug}`]) {
    await page.goto(path);
    expect(await overflow(page), path).toBeLessThanOrEqual(0);
  }
});

test('nothing scrolls sideways at 320px either', async ({ page, db }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 640 });
  const [suit] = await db
    .select({ slug: product.slug })
    .from(product)
    .where(eq(product.designCode, 'E2E-01'));
  for (const path of ['/', '/shop', `/products/${suit!.slug}`, '/contact', '/search?q=dhanak']) {
    await page.goto(path);
    expect(await overflow(page), path).toBeLessThanOrEqual(0);
  }
});
