import { expect, type Page, test } from '@playwright/test';

// The home page's New Arrivals ring (owner, 2026-11-17; docs/design.md, home section 3).
const ring = (page: Page) => page.getByRole('group', { name: 'Newest suits' });
const frontName = (page: Page) =>
  ring(page).getByTestId('circle-front').getByRole('heading').textContent();

test('the ring fits the screen and every suit links to its page', async ({ page }) => {
  await page.goto('/');
  await ring(page).scrollIntoViewIfNeeded();
  const links = ring(page).getByRole('list').getByRole('link');
  expect(await links.count()).toBeGreaterThanOrEqual(4);
  await expect(links.first()).toHaveAttribute('href', /^\/products\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('Next and Previous turn the ring by one suit', async ({ page }) => {
  await page.goto('/');
  await ring(page).scrollIntoViewIfNeeded();
  const first = await frontName(page);
  await ring(page).getByRole('button', { name: 'Next suit' }).click();
  await expect.poll(() => frontName(page)).not.toBe(first);
  await ring(page).getByRole('button', { name: 'Previous suit' }).click();
  await expect.poll(() => frontName(page)).toBe(first);
});

test('the front card opens its suit', async ({ page }) => {
  await page.goto('/');
  await ring(page).scrollIntoViewIfNeeded();
  const front = ring(page).locator('li[data-front="true"] a');
  await expect(front).toHaveCount(1);
  const href = await front.getAttribute('href');
  await front.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('dragging with the mouse spins the ring and never opens a suit', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Phones swipe with touch; the mouse drag is for laptops.');
  await page.goto('/');
  const stage = ring(page).getByRole('list');
  await stage.scrollIntoViewIfNeeded();
  // Let the intro finish first.
  await page.waitForTimeout(1200);
  const first = await frontName(page);
  // The front card is at the bottom of the ring: bring it on screen to grab it.
  const front = ring(page).locator('li[data-front="true"]');
  await front.scrollIntoViewIfNeeded();
  const box = (await front.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 220, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => frontName(page)).not.toBe(first);
  await expect(page).toHaveURL(/\/$/);
});

test('with reduced motion the cards are on the ring at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const cards = ring(page).getByRole('listitem');
  await cards.first().scrollIntoViewIfNeeded();
  // Spread out: the first card (in front) sits well below the one opposite it.
  const count = await cards.count();
  const front = (await cards.first().boundingBox())!;
  const back = (await cards.nth(Math.floor(count / 2)).boundingBox())!;
  expect(front.y - back.y).toBeGreaterThan(100);
});
