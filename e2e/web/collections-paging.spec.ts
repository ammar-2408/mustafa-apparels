import { category, slugRedirect } from '@mustafa/db/schema';
import { and, eq } from 'drizzle-orm';

import { expect, test } from '../support/users';

// Collection paging and addresses (ADR-017, docs/design.md §8.6). Lajwanti has 25 published demo
// suits in the E2E database (1 + 24 paging suits), so it has a real page 2.
test('a collection page 2 answers 200 with its own canonical and the last suit', async ({
  page,
  request,
}) => {
  const response = await page.goto('/collections/lajwanti/page/2');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Previous' }),
  ).toHaveAttribute('href', '/collections/lajwanti');

  const html = await (await request.get('/collections/lajwanti/page/2')).text();
  const head = html.slice(0, html.indexOf('</head>'));
  const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  expect(canonicals).toHaveLength(1);
  expect(canonicals[0]![1]).toMatch(/\/collections\/lajwanti\/page\/2$/);
  expect((await request.get('/collections/lajwanti/page/3')).status()).toBe(404);
});

test('an old collection address moves to the current one and keeps the page number', async ({
  db,
  request,
}) => {
  const [lajwanti] = await db.select().from(category).where(eq(category.slug, 'lajwanti'));
  const oldSlug = `lajwanti-old-${Date.now()}`;
  await db.insert(slugRedirect).values({ entity: 'category', oldSlug, targetId: lajwanti!.id });
  try {
    const page2 = await request.get(`/collections/${oldSlug}/page/2`, { maxRedirects: 0 });
    expect(page2.status()).toBe(308);
    expect(page2.headers()['location']).toMatch(/\/collections\/lajwanti\/page\/2$/);
  } finally {
    await db
      .delete(slugRedirect)
      .where(and(eq(slugRedirect.entity, 'category'), eq(slugRedirect.oldSlug, oldSlug)));
  }
});

test('a hidden collection is a 404 on both address shapes, even through an old address', async ({
  db,
  request,
}) => {
  const slug = `hidden-${Date.now()}`;
  const [hidden] = await db
    .insert(category)
    .values({ name: 'Hidden', slug, sortOrder: 99, isActive: false })
    .returning();
  const oldSlug = `${slug}-old`;
  await db.insert(slugRedirect).values({ entity: 'category', oldSlug, targetId: hidden!.id });
  try {
    for (const path of [
      `/collections/${slug}`,
      `/collections/${slug}/page/2`,
      `/collections/${oldSlug}`,
    ]) {
      expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
    }
  } finally {
    await db.delete(slugRedirect).where(eq(slugRedirect.oldSlug, oldSlug));
    await db.delete(category).where(eq(category.id, hidden!.id));
  }
});

test('an address with capitals moves permanently to the lowercase one', async ({ request }) => {
  for (const [from, to] of [
    ['/collections/Lajwanti', '/collections/lajwanti'],
    ['/collections/LAJWANTI/page/2', '/collections/lajwanti/page/2'],
  ]) {
    const response = await request.get(from!, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe(to);
  }
  const shop = await (await request.get('/shop')).text();
  const slug = shop.match(/href="\/products\/([a-z0-9-]+)"/)![1]!;
  const suit = await request.get(`/products/${slug.toUpperCase()}`, { maxRedirects: 0 });
  expect(suit.status()).toBe(308);
  expect(new URL(suit.headers()['location']!, 'http://x').pathname).toBe(`/products/${slug}`);
});
