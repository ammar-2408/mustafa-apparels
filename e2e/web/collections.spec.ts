import { category, slugRedirect } from '@mustafa/db/schema';
import { and, eq } from 'drizzle-orm';

import { expectRedirectTo } from '../support/redirects';
import { expect, test } from '../support/users';

// Collection pages (ADR-017, docs/design.md §8.6). E2E data: dhanak has 5 published suits,
// khaddar 4, lajwanti 1, so each is one page.
test('a collection page shows its name, its text, its suits and a self canonical', async ({
  page,
  request,
}) => {
  const response = await page.goto('/collections/khaddar');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Khaddar' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Unstitched 3-piece Khaddar suits for winter');
  await expect(page.getByText('4 suits')).toBeVisible();
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(4);
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'All suits' }),
  ).toHaveAttribute('href', '/shop');

  const html = await (await request.get('/collections/khaddar')).text();
  const head = html.slice(0, html.indexOf('</head>'));
  const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  expect(canonicals).toHaveLength(1);
  expect(canonicals[0]![1]).toMatch(/^https?:\/\/[^/]+\/collections\/khaddar$/);
  expect(head).toMatch(/<meta name="description" content="Unstitched 3-piece Khaddar/);
});

test('unknown collections and bad page numbers are real 404s; page 1 moves to the clean URL', async ({
  request,
}) => {
  for (const path of [
    '/collections/no-such-collection',
    '/collections/khaddar/page/2',
    '/collections/khaddar/page/01',
    '/collections/khaddar/page/abc',
    '/collections/no-such-collection/page/2',
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
  const first = await request.get('/collections/khaddar/page/1', { maxRedirects: 0 });
  expect(first.status()).toBe(301);
  expectRedirectTo(first, '/collections/khaddar');
});

test('an old collection address moves permanently to the current one', async ({ db, request }) => {
  const [khaddar] = await db.select().from(category).where(eq(category.slug, 'khaddar'));
  const oldSlug = `khaddar-old-${Date.now()}`;
  await db.insert(slugRedirect).values({ entity: 'category', oldSlug, targetId: khaddar!.id });
  try {
    const response = await request.get(`/collections/${oldSlug}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expectRedirectTo(response, '/collections/khaddar');
  } finally {
    await db
      .delete(slugRedirect)
      .where(and(eq(slugRedirect.entity, 'category'), eq(slugRedirect.oldSlug, oldSlug)));
  }
});

test('a collection page has the template header: the serif title and the count badge', async ({
  page,
}) => {
  await page.goto('/collections/khaddar');
  const h1 = page.getByRole('heading', { level: 1, name: 'Khaddar' });
  await expect(h1).toBeVisible();
  // The serif is loaded on collection pages only, and the title really uses it.
  expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/DM Serif/i);
  await expect(page.getByText(/^\d+ suits?$/)).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }),
  ).toHaveAttribute('href', '/');
});

test('on a phone the filter bar fits: chips wrap, and Filters and Sort share a row', async ({
  page,
}) => {
  test.skip(page.viewportSize()!.width >= 768, 'Phones only.');
  await page.goto('/collections/dhanak');
  const width = page.viewportSize()!.width;
  const chips = page.getByRole('group', { name: 'Quick filters' }).getByRole('button');
  for (const box of await chips.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().right),
  )) {
    expect(box).toBeLessThanOrEqual(width);
  }
  const filters = (await page.getByRole('button', { name: /^Filters/ }).boundingBox())!;
  const sort = (await page.getByRole('combobox', { name: 'Sort' }).boundingBox())!;
  expect(Math.abs(filters.y + filters.height / 2 - (sort.y + sort.height / 2))).toBeLessThan(4);
  expect(sort.x + sort.width).toBeLessThanOrEqual(width);
});
