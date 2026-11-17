import { expect, test } from '@playwright/test';

// docs/design.md §1.3: the full secondary logo on every screen (owner, 2026-11-17), so its small
// line can be read: 48px on phones, 64px from md (768px), 72px from lg (1024px), 80px from xl.
const expectedHeight = (width: number) =>
  width >= 1280 ? 80 : width >= 1024 ? 72 : width >= 768 ? 64 : 48;

test('the header shows the full logo, sized for the screen width, linked home', async ({
  page,
}) => {
  await page.goto('/');
  const home = page.getByRole('banner').getByRole('link', { name: 'Mustafa Apparels home' });
  await expect(home).toBeVisible();

  const width = page.viewportSize()!.width;
  const shown = home.locator('img:visible');
  await expect(shown).toHaveCount(1);
  await expect(shown).toHaveAttribute('src', /secondary-black\.svg$/);
  const box = (await shown.boundingBox())!;
  expect(box.height).toBe(expectedHeight(width));
  // Never squeezed: the logo keeps its own proportions (971.46 × 281.98) and fits on screen.
  expect(box.width / box.height).toBeCloseTo(971.46 / 281.98, 1);
  expect(box.x + box.width).toBeLessThanOrEqual(width);

  expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  // Nothing in the bar runs off the screen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
