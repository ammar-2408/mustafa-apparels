import { expect, test } from '@playwright/test';

// docs/design.md §1.3: the submark on phones, the secondary logo from md (768px) up.
test('the header shows one logo for the screen width, linked home', async ({ page }) => {
  await page.goto('/');
  const home = page.getByRole('link', { name: 'Mustafa Apparels home' });
  await expect(home).toBeVisible();

  const wide = (page.viewportSize()?.width ?? 0) >= 768;
  const submark = home.locator('img[src$="submark-black.svg"]');
  const secondary = home.locator('img[src$="secondary-black.svg"]');
  await expect(wide ? secondary : submark).toBeVisible();
  await expect(wide ? submark : secondary).toBeHidden();

  const box = await home.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
