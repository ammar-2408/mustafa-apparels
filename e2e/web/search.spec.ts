import AxeBuilder from '@axe-core/playwright';

import { expect, test } from '../support/users';

// Search opens as a box from the navbar (owner, 2026-11-22): no search page. Typo-tolerant
// suggestions in a keyboard combobox (docs/prd.md W6); Enter opens the best match.
async function openSearch(page: import('@playwright/test').Page) {
  const header = page.getByRole('banner');
  const button = header.getByRole('button', { name: 'Search' });
  // Phones under 360px keep Search in the menu panel only.
  if (await button.isVisible()) {
    await button.click();
  } else {
    await header.getByRole('button', { name: /Menu/ }).click();
    await page
      .getByRole('dialog', { name: 'Menu' })
      .getByRole('button', { name: 'Search' })
      .click();
  }
  const panel = page.getByRole('dialog', { name: 'Search suits' });
  await expect(panel).toBeVisible();
  return panel;
}

test('the navbar search opens a box with the cursor in it, and Esc closes it', async ({ page }) => {
  await page.goto('/about');
  const panel = await openSearch(page);
  const box = panel.getByRole('combobox', { name: 'Search suits' });
  await expect(box).toBeFocused();
  await expect(page).toHaveURL(/\/about$/);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('a typo still finds Khaddar, suits show a photo, and the keyboard opens one', async ({
  page,
}) => {
  await page.goto('/');
  const panel = await openSearch(page);
  const box = panel.getByRole('combobox', { name: 'Search suits' });
  await box.fill('khadar');
  await expect(panel.getByRole('listbox', { name: 'Suggestions' })).toBeVisible();
  await expect(panel.getByRole('option').first()).toContainText('Khaddar');
  await expect(panel.getByRole('option').last().locator('img')).toHaveCount(1);
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/collections\/khaddar$/);
  // Moving to the page closes the box.
  await expect(page.getByRole('dialog', { name: 'Search suits' })).toBeHidden();
});

test('Enter with nothing chosen opens the best match', async ({ page }) => {
  await page.goto('/');
  const panel = await openSearch(page);
  const box = panel.getByRole('combobox', { name: 'Search suits' });
  await box.fill('dhanak');
  await expect(panel.getByRole('option').first()).toBeVisible();
  await box.press('Enter');
  await expect(page).toHaveURL(/\/(collections|products)\//);
});

test('nothing found says so and points to all suits', async ({ page }) => {
  await page.goto('/');
  const panel = await openSearch(page);
  await panel.getByRole('combobox', { name: 'Search suits' }).fill('qqqqzz');
  await expect(panel.getByText(/No suits match “qqqqzz”/)).toBeVisible();
  await expect(panel.getByRole('link', { name: 'see all suits' })).toHaveAttribute('href', '/shop');
});

test('the open search box has no serious accessibility problems', async ({ page }) => {
  await page.goto('/');
  const panel = await openSearch(page);
  await panel.getByRole('combobox', { name: 'Search suits' }).fill('khadar');
  await expect(panel.getByRole('listbox')).toBeVisible();
  const results = await new AxeBuilder({ page }).include('dialog[open]').analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact!));
  expect(serious.map((v) => v.id)).toEqual([]);
});

test('the old search page address goes to All Suits for good', async ({ request }) => {
  const response = await request.get('/search?q=dhanak', { maxRedirects: 0 });
  expect([301, 308]).toContain(response.status());
  // Next keeps the query string; All Suits ignores it.
  expect(response.headers().location).toMatch(/^\/shop(\?|$)/);
});
