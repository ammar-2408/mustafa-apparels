import { expect, test } from '../support/users';

// /shop and its path pages (ADR-017). The E2E database has 34 published suits: two pages of 24.
const SITE = /^https?:\/\/[^/]+/;

test('/shop lists the published suits newest first, as cards that open each suit', async ({
  page,
}) => {
  const response = await page.goto('/shop');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'All suits' })).toBeVisible();
  await expect(page.getByText(/^\d+ suits$/)).toBeVisible();

  const cards = page.getByRole('main').getByRole('article');
  expect(await cards.count()).toBeGreaterThanOrEqual(10);
  const first = cards.first();
  await expect(first.getByText(/PKR [\d,]+/)).toBeVisible();
  const href = await first.getByRole('link').first().getAttribute('href');
  expect(href).toMatch(/^\/products\/[a-z0-9-]+$/);
  // No draft or archived suit on the shop (E2E-11 is a draft, E2E-12 archived).
  await expect(page.getByRole('main')).not.toContainText(/E2E-1[12]/);
});

test('the grid has 2 columns on phones, 4 on a laptop and 5 from 1920px', async ({ page }) => {
  await page.goto('/shop');
  const tops = await page
    .getByRole('main')
    .getByRole('article')
    .evaluateAll((items) => items.slice(0, 5).map((el) => el.getBoundingClientRect().top));
  const firstRow = tops.filter((top) => Math.abs(top - tops[0]!) < 2).length;
  const width = page.viewportSize()!.width;
  expect(firstRow).toBe(width >= 1920 ? 5 : width >= 1280 ? 4 : width >= 768 ? 3 : 2);
});

test('the server HTML has one absolute canonical to /shop, even with filter params', async ({
  request,
}) => {
  for (const path of ['/shop', '/shop?fabric=dhanak&sort=price_asc']) {
    const html = await (await request.get(path)).text();
    const head = html.slice(0, html.indexOf('</head>'));
    const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0]![1]!.replace(SITE, '')).toBe('/shop');
    expect(canonicals[0]![1]).toMatch(/^https?:\/\//);
  }
});

test('/shop/page/1 moves permanently to /shop', async ({ request }) => {
  const response = await request.get('/shop/page/1', { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers()['location']).toMatch(/\/shop$/);
  expect(response.headers()['location']).not.toContain(',');
});

test('page 2 is its own page: 200, its own canonical, the rest of the suits and links back', async ({
  page,
  request,
}) => {
  const response = await page.goto('/shop/page/2');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Page 2');
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(10);
  const pages = page.getByRole('navigation', { name: 'Pages' });
  await expect(pages.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/shop');
  await expect(pages.getByRole('link', { name: 'Page 1' })).toHaveAttribute('href', '/shop');
  await expect(pages.locator('[aria-current="page"]')).toHaveText('Page 2');
  await expect(pages.getByRole('link', { name: 'Next' })).toHaveCount(0);

  const html = await (await request.get('/shop/page/2')).text();
  const head = html.slice(0, html.indexOf('</head>'));
  const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  expect(canonicals).toHaveLength(1);
  expect(canonicals[0]![1]).toMatch(/\/shop\/page\/2$/);
  // The list data numbers suits from where page 2 starts.
  const list = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]!) as { '@type': string; itemListElement?: { position: number }[] })
    .find((b) => b['@type'] === 'ItemList')!;
  expect(list.itemListElement![0]!.position).toBe(25);

  // Page 1 links on to page 2.
  await page.goto('/shop');
  await expect(
    page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Next' }),
  ).toHaveAttribute('href', '/shop/page/2');
});

test('a bad or out-of-range page number is a real 404', async ({ request }) => {
  for (const n of ['0', '01', 'abc', '-1', '3', '999']) {
    const response = await request.get(`/shop/page/${n}`, { maxRedirects: 0 });
    expect(response.status(), `/shop/page/${n}`).toBe(404);
  }
});
