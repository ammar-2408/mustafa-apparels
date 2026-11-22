import { expect, test } from '../support/users';

// About, Contact, How to Order, FAQ, Privacy and Terms (docs/prd.md W10).
const PAGES = ['/about', '/contact', '/how-to-order', '/faq', '/privacy', '/terms'];

for (const path of PAGES) {
  test(`${path} answers 200 with one h1, a self canonical and a 120–160 character description`, async ({
    request,
  }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    expect(canonicals).toHaveLength(1);
    expect(new URL(canonicals[0]![1]!).pathname).toBe(path);
    const description = head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    expect(description.length, description).toBeGreaterThanOrEqual(120);
    expect(description.length, description).toBeLessThanOrEqual(160);
  });
}

test('Contact has WhatsApp first, no address or map, and store data without an address', async ({
  page,
  request,
}) => {
  await page.goto('/contact');
  const links = page
    .getByRole('main')
    .getByRole('link')
    .filter({ hasText: /WhatsApp|Call|@/ });
  await expect(links.first()).toHaveText('WhatsApp us');
  await expect(page.locator('iframe')).toHaveCount(0);
  const html = await (await request.get('/contact')).text();
  const store = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]!) as Record<string, unknown>)
    .find((b) => b['@type'] === 'OnlineStore');
  expect(store).toBeTruthy();
  expect(store).not.toHaveProperty('address');
});

test('the FAQ headings are questions, and Privacy discloses Google Analytics', async ({ page }) => {
  await page.goto('/faq');
  const headings = await page
    .getByRole('main')
    .getByRole('heading', { level: 2 })
    .allTextContents();
  expect(headings.length).toBeGreaterThan(3);
  for (const heading of headings) expect(heading).toMatch(/\?$/);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Google Analytics' })).toBeVisible();
});

test('a missing page or suit is a real 404 with the branded page, inside one main', async ({
  page,
}) => {
  for (const path of ['/no-such-page', '/products/no-such-suit', '/shop/page/abc']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We can’t find that page');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('main').getByRole('link', { name: 'See all suits' })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

// Noindex pages still get a full description: some search tools show it anyway.
for (const path of ['/login', '/register', '/forgot-password', '/account']) {
  test(`${path} has a 120–160 character description`, async ({ request }) => {
    const html = await (await request.get(path, { maxRedirects: 0 })).text();
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    expect(description.length, description).toBeGreaterThanOrEqual(120);
    expect(description.length, description).toBeLessThanOrEqual(160);
  });
}

// The owner (2026-11-22): the title area and the first row of cards show on the first screen at
// every size; the rest of the cards follow on scroll. Window sizes as in auth.spec.ts.
test('Privacy and Terms show the title and the first cards on the first screen', async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const [width, height] of [
    [390, 740],
    [1366, 657],
    [1280, 610],
    [1920, 940],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const path of ['/privacy', '/terms']) {
      await page.goto(path);
      const firstCard = page.getByRole('main').locator('section').first();
      const box = (await firstCard.boundingBox())!;
      expect(box.y + box.height, `${path} at ${width}×${height}`).toBeLessThanOrEqual(height);
    }
  }
});
