import { expect, test } from '@playwright/test';

import { montserratWeights } from '../support/fonts';

test.use({ baseURL: 'http://localhost:3001' });

// Every other admin page needs a session (e2e/admin/gate.spec.ts), so these start at /login.
test('admin login page loads with a title and a main heading', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Log in | Mustafa Apparels Admin');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('admin login page uses the white page and ink text', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(17, 17, 17)');
});

test('admin login page is set in Montserrat, loaded in weights 300 and 400 only', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.locator('body')).toHaveCSS('font-family', /Montserrat/);
  expect(await montserratWeights(page)).toEqual(['300', '400']);
});
