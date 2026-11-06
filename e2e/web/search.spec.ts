import { expect, test } from '../support/users';

// Search (docs/prd.md W6): typo-tolerant, noindex, follow; suggestions in a keyboard combobox.
test('a typo still finds the Khaddar suits, and the page is noindex, follow', async ({ page }) => {
  const response = await page.goto('/search?q=khadar');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
  await expect(page.getByText(/^\d+ suits? for “khadar”$/)).toBeVisible();
  const cards = page.getByRole('main').getByRole('article');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first()).toContainText('Khaddar');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
});

test('suggestions appear as you type and open with the keyboard', async ({ page }) => {
  await page.goto('/search');
  const box = page.getByRole('combobox', { name: 'Search suits' });
  await box.fill('khad');
  await expect(page.getByRole('listbox', { name: 'Suggestions' })).toBeVisible();
  await expect(page.getByRole('option').first()).toContainText('Khaddar');
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/collections\/khaddar$/);
});

test('an empty or too short search asks for more, and searching submits the form', async ({
  page,
}) => {
  await page.goto('/search?q=k');
  await expect(page.getByText('Type 2 to 60 letters or numbers to search.')).toBeVisible();
  const box = page.getByRole('combobox', { name: 'Search suits' });
  await box.fill('dhanak');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=dhanak$/);
  await expect(page.getByText(/suits? for “dhanak”/)).toBeVisible();
});
