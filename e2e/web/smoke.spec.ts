import { expect, test } from '@playwright/test';

test('home page loads with a main heading', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('home page uses the brand cream and ink', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 247, 236)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(17, 17, 17)');
});
