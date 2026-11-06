import { expect, test } from '../support/users';

// Home (docs/design.md §4), static: no motion or 3D yet (Phase 8).
test('home has the hero, new arrivals, the three collections, a featured suit and how to order', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Unstitched suits, ready for your tailor',
  );

  const arrivals = page.getByRole('region', { name: 'New arrivals' });
  expect(await arrivals.getByRole('article').count()).toBeGreaterThanOrEqual(4);

  const collections = page.getByRole('region', { name: 'Collections' });
  for (const name of ['Dhanak', 'Khaddar', 'Lajwanti']) {
    await expect(collections.getByRole('heading', { name })).toBeVisible();
  }
  await expect(collections.getByRole('link').first()).toHaveAttribute(
    'href',
    '/collections/dhanak',
  );

  // E2E-02 is the newest published suit with a video.
  const featured = page.getByRole('region', { name: /Suit$/ }).filter({ hasText: 'Featured' });
  await expect(featured.locator('video')).toHaveCount(1);

  const steps = page.getByRole('region', { name: 'How to order' }).getByRole('listitem');
  await expect(steps).toHaveCount(3);
  await expect(page.getByRole('region', { name: 'Ask us about any suit' })).toContainText(
    'WhatsApp us',
  );
});

test('the menu link to new arrivals lands on that row', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('dialog', { name: 'Menu' })
    .getByRole('link', { name: 'New arrivals' })
    .click();
  await expect(page).toHaveURL(/\/#new-arrivals$/);
  await expect(page.getByRole('heading', { name: 'New arrivals' })).toBeInViewport();
});

test('home describes the shop as an online store with no address or opening hours', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as Record<string, unknown>,
  );
  const store = blocks.find((b) => b['@type'] === 'OnlineStore')!;
  expect(store).toMatchObject({ name: 'Mustafa Apparels', alternateName: 'MA Apparels' });
  expect(store).not.toHaveProperty('address');
  expect(store).not.toHaveProperty('openingHours');
  expect(store).not.toHaveProperty('openingHoursSpecification');
});
