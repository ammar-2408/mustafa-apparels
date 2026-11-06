import { expect, test } from '../support/users';

// Filters and sort in the browser (ADR-018). Demo suits: 5 embroidered and 5 printed published.
const cardsIn = (page: import('@playwright/test').Page) =>
  page.getByRole('main').getByRole('article');

test('a quick chip narrows the grid, updates the URL, and Back undoes it', async ({ page }) => {
  await page.goto('/shop');
  const all = await cardsIn(page).count();
  const chip = page.getByRole('group', { name: 'Quick filters' }).getByRole('button', {
    name: 'Embroidered',
  });
  await chip.click();
  await expect(page).toHaveURL(/\/shop\?design=embroidered$/);
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^\d+ suits? match$/)).toBeVisible();
  const narrowed = await cardsIn(page).count();
  expect(narrowed).toBeGreaterThan(0);
  expect(narrowed).toBeLessThan(all);
  for (const card of await cardsIn(page).all()) {
    await expect(card).toContainText('Embroidered');
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(cardsIn(page)).toHaveCount(all);
});

test('a shared link opens with its filters and sort, and the panel offers only useful filters', async ({
  page,
}) => {
  await page.goto('/shop?design=embroidered&sort=price_desc');
  await expect(page.getByText(/^\d+ suits? match$/)).toBeVisible();
  const prices = await cardsIn(page)
    .getByText(/PKR [\d,]+/)
    .allTextContents();
  const values = prices.map((p) => Number(p.replace(/\D/g, '')));
  expect(values).toEqual([...values].sort((a, b) => b - a));
  await expect(page.getByRole('combobox', { name: 'Sort' })).toHaveValue('price_desc');

  await page.getByRole('button', { name: /^Filters/ }).click();
  const panel = page.getByRole('dialog', { name: 'Filters' });
  await expect(panel.getByRole('group', { name: 'Collection' })).toBeVisible();
  // Every demo suit is Unstitched Suits only, so that filter is hidden.
  await expect(panel.getByRole('group', { name: 'Category' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Clear' }).click();
  await expect(page).toHaveURL(/\/shop\?sort=price_desc$/);
});

test('a collection page filters only its own suits', async ({ page }) => {
  await page.goto('/collections/dhanak?sort=price_asc');
  await expect(page.getByText(/^\d+ suits? match$/)).toBeVisible();
  const links = await cardsIn(page)
    .getByRole('link')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(links.length).toBe(5);
});

test('the page stays static: the server sends the same grid with or without filters', async ({
  request,
}) => {
  // Every suit link the plain page has is in the filtered page's server HTML too: the server
  // ignores the query, and crawlers and no-JavaScript visitors get the whole grid.
  const links = async (path: string) =>
    new Set((await (await request.get(path)).text()).match(/\/products\/[a-z0-9-]+/g) ?? []);
  const plain = await links('/shop');
  const filtered = await links('/shop?design=embroidered&sort=price_asc');
  expect(plain.size).toBeGreaterThanOrEqual(10);
  expect([...plain].filter((href) => !filtered.has(href))).toEqual([]);
  const api = await request.get('/api/suits');
  expect(api.status()).toBe(200);
  const body = (await api.json()) as { suits: { slug: string; design: string[] }[] };
  expect(body.suits.length).toBeGreaterThanOrEqual(10);
  expect(body.suits[0]).toHaveProperty('design');
});
