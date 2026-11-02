import { expect, test } from '@playwright/test';

// docs/design.md §1.3: the submark on phones, the secondary logo from md (768px),
// and the secondary logo larger from lg (1024px).
const expectedLogo = (width: number) =>
  width >= 1024
    ? { file: 'secondary', height: 64 }
    : width >= 768
      ? { file: 'secondary', height: 48 }
      : { file: 'submark', height: 32 };

test('the header shows one logo, sized for the screen width, linked home', async ({ page }) => {
  await page.goto('/');
  const home = page.getByRole('link', { name: 'Mustafa Apparels home' });
  await expect(home).toBeVisible();

  const expected = expectedLogo(page.viewportSize()?.width ?? 0);
  const shown = home.locator('img:visible');
  await expect(shown).toHaveCount(1);
  await expect(shown).toHaveAttribute('src', new RegExp(`${expected.file}-black\\.svg$`));
  expect((await shown.boundingBox())?.height).toBe(expected.height);

  expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});
