import { expect, test } from '../support/users';

// Home (docs/design.md §4), static: no motion or 3D yet (Phase 8).
test('home has the hero, about, new arrivals and how to order', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Elegant Unstitched Suits, Made for Every Occasion',
  );
  // The hero names the collections from the database, and its fabric picture (when a Cloudinary
  // cloud is set) is asked for at once, being the largest thing on screen.
  const hero = page.getByRole('region', { name: /^Elegant Unstitched Suits/ });
  await expect(hero).toContainText('suits in Dhanak, ');
  const picture = hero.locator('img[src*="hero-fabric"]');
  if ((await picture.count()) > 0) {
    await expect(picture).toHaveAttribute('loading', 'eager');
    await expect(picture).toHaveAttribute('fetchpriority', 'high');
  }
  await expect(hero.getByRole('link', { name: 'See All Suits' })).toHaveAttribute('href', '/shop');

  // The plain facts about the shop come next, as one sentence in the server HTML.
  await expect(
    page.getByRole('heading', {
      name: 'Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan.',
    }),
  ).toBeVisible();

  const arrivals = page.getByRole('region', { name: 'New arrivals' });
  expect(await arrivals.getByRole('article').count()).toBeGreaterThanOrEqual(4);

  // One card per collection in the database, each linking to its page.
  const collections = page.getByRole('region', { name: 'Explore Our Collections' });
  for (const name of ['Dhanak', 'Khaddar', 'Lajwanti']) {
    await expect(collections.getByRole('heading', { name, exact: true })).toBeAttached();
  }
  await expect(
    collections.getByRole('link', { name: 'See the collection: Dhanak' }),
  ).toHaveAttribute('href', '/collections/dhanak');

  const steps = page.getByRole('region', { name: 'How to order' }).getByRole('listitem');
  await expect(steps).toHaveCount(3);
  // The featured suit and the "Ask us" strip were removed (owner, 2026-11-15).
  await expect(page.locator('main video')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Ask us about any suit' })).toHaveCount(0);
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

test('the first screen shows only the hero: About starts below it', async ({ page }) => {
  await page.goto('/');
  const about = page.locator('#about-title');
  const top = await about.evaluate((el) => el.closest('section')!.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
});
