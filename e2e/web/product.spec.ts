import { product, slugRedirect } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { expect, test } from '../support/users';

// The suit page (docs/design.md §9.2, §8.6). Demo suits: E2E-03 has an old slug that
// redirects, E2E-11 is a draft, E2E-12 archived.
const slugOf = async (db: Parameters<Parameters<typeof test>[2]>[0]['db'], code: string) =>
  (await db.select({ slug: product.slug }).from(product).where(eq(product.designCode, code)))[0]!
    .slug;

test('a suit page shows the suit, what is included and its details, in one h1', async ({
  page,
  db,
}) => {
  const slug = await slugOf(db, 'E2E-01');
  const response = await page.goto(`/products/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByText(/^Design code E2E-01$/)).toBeVisible();
  await expect(page.getByText(/PKR 3,500/).first()).toBeVisible();

  const included = page.getByRole('region', { name: "What's included" });
  await expect(included).toContainText('An unstitched 3-piece suit');
  await expect(included.getByRole('listitem').first()).toHaveText(/^Shirt: /);
  await expect(page.getByRole('region', { name: 'Details' })).toContainText('Fabric');

  const photo = page.getByRole('button', { name: /^Zoom photo 1 of/ });
  await expect(photo).toBeVisible();
  await photo.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the server HTML has the canonical and Product data with a seller and no brand', async ({
  request,
  db,
}) => {
  const slug = await slugOf(db, 'E2E-01');
  const html = await (await request.get(`/products/${slug}`)).text();
  const head = html.slice(0, html.indexOf('</head>'));
  const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  expect(canonicals).toHaveLength(1);
  expect(canonicals[0]![1]).toMatch(new RegExp(`/products/${slug}$`));

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as Record<string, unknown>,
  );
  const data = blocks.find((b) => b['@type'] === 'Product')!;
  expect(data).toBeTruthy();
  expect(data).not.toHaveProperty('brand');
  expect(data).toMatchObject({
    sku: 'E2E-01',
    offers: { price: 3500, priceCurrency: 'PKR', seller: { name: 'Mustafa Apparels' } },
  });
  expect(blocks.some((b) => b['@type'] === 'BreadcrumbList')).toBe(true);
});

test('an old slug moves permanently; unknown, draft and archived suits are real 404s', async ({
  request,
  db,
}) => {
  const target = await slugOf(db, 'E2E-03');
  const [old] = await db
    .select({ oldSlug: slugRedirect.oldSlug })
    .from(slugRedirect)
    .where(eq(slugRedirect.entity, 'product'));
  const moved = await request.get(`/products/${old!.oldSlug}`, { maxRedirects: 0 });
  expect(moved.status()).toBe(308);
  expect(moved.headers()['location']).toMatch(new RegExp(`/products/${target}$`));

  for (const path of [
    '/products/no-such-suit',
    `/products/${await slugOf(db, 'E2E-11')}`,
    `/products/${await slugOf(db, 'E2E-12')}`,
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});
