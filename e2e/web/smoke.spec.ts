import { expect, test } from '@playwright/test';

import { montserratWeights } from '../support/fonts';

test('home page loads with a title and a main heading', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Mustafa Apparels');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('home page uses the brand cream and ink', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 247, 236)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(17, 17, 17)');
});

test('home page is set in Montserrat, loaded in weights 300 and 400 only', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('font-family', /Montserrat/);
  expect(await montserratWeights(page)).toEqual(['300', '400']);
});
