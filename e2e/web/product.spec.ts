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
  expect(moved.headers()['location']).not.toContain(',');

  for (const path of [
    '/products/no-such-suit',
    `/products/${await slugOf(db, 'E2E-11')}`,
    `/products/${await slugOf(db, 'E2E-12')}`,
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});

test('a suit video loads nothing until it comes into view, then plays silently', async ({
  page,
  db,
}) => {
  await page.goto(`/products/${await slugOf(db, 'E2E-02')}`);
  const video = page.locator('video');
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).not.toHaveAttribute('src', /.+/);
  expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);

  // Phones swipe to it (or tap its thumbnail); from lg it sits below the main photo.
  const thumb = page.getByRole('button', { name: /^Show the video/ });
  if (await thumb.isVisible()) await thumb.click();
  else await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute('src', /\/video\/upload\/ac_none,/);
  await expect(page.getByRole('button', { name: /^(Pause|Play) video$/ })).toBeVisible();
});

test('grids never show a video', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.locator('video')).toHaveCount(0);
});

test('WhatsApp comes first and names the suit; on phones a bar keeps it in reach', async ({
  page,
  db,
}) => {
  const slug = await slugOf(db, 'E2E-01');
  await page.goto(`/products/${slug}`);
  const main = page.getByRole('main');
  const whatsapp = main.getByRole('link', { name: 'Order on WhatsApp' }).first();
  const href = decodeURIComponent((await whatsapp.getAttribute('href'))!);
  expect(href).toMatch(
    /^https:\/\/wa\.me\/\d+\?text=Hi! I'm interested in ".+" \(E2E-01, PKR 3,500\): /,
  );
  expect(href).toContain(`/products/${slug}`);
  await expect(main.getByRole('link', { name: /^Call/ })).toBeVisible();

  const bars = main.getByRole('link', { name: 'Order on WhatsApp' });
  const phone = page.viewportSize()!.width < 1024;
  // Two on phones (in the details and in the bar), one from lg.
  await expect(bars).toHaveCount(phone ? 2 : 1);
  if (phone) {
    const bar = bars.last();
    await expect(bar).toBeVisible();
    // At the very bottom of the page, the footer's last line still sits above the bar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const barTop = (await bar.boundingBox())!.y - 12;
    const content = page.getByRole('contentinfo').getByText('© Mustafa Apparels');
    const box = (await content.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(barTop + 1);
  }
});
