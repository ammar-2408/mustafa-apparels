import { expect, test } from '@playwright/test';

// The glossy 3D buttons (owner's button-template.png, 2026-11-22; packages/config/tailwind/
// buttons.css): a pill with a round arrow; on hover it lifts 3px, a light sweeps across once and
// the arrow pushes 4px right; reduced motion keeps everything still.
const button = (page: import('@playwright/test').Page) =>
  page.getByRole('main').getByRole('link', { name: 'See all suits' });

test('every button is a glossy pill with its round arrow', async ({ page }) => {
  await page.goto('/no-such-page');
  const link = button(page);
  await expect(link).toBeVisible();
  const look = await link.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      radius: parseFloat(style.borderTopLeftRadius),
      height: el.getBoundingClientRect().height,
      gloss: style.backgroundImage,
      circle: el.querySelectorAll('.btn-circle').length,
    };
  });
  expect(look.radius).toBeGreaterThanOrEqual(look.height / 2 - 1);
  expect(look.height).toBeGreaterThanOrEqual(56);
  expect(look.gloss).toContain('linear-gradient');
  expect(look.circle).toBe(1);
});

test('on hover the button lifts, the light sweeps once and the arrow pushes right', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Phones have no hover; they get the press.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/no-such-page');
  const link = button(page);
  const circle = link.locator('.btn-circle');
  const sweep = () => link.evaluate((el) => getComputedStyle(el, '::after').translate);
  expect(await sweep()).toContain('-110%');
  await link.hover();
  await expect.poll(() => link.evaluate((el) => getComputedStyle(el).translate)).toBe('0px -3px');
  await expect.poll(() => circle.evaluate((el) => getComputedStyle(el).translate)).toBe('4px');
  await expect.poll(sweep).toContain('110%');
  expect(await sweep()).not.toContain('-110%');
});

test('with reduced motion nothing moves', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones have no hover.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/no-such-page');
  const link = button(page);
  await link.hover();
  await page.waitForTimeout(300);
  expect(await link.evaluate((el) => getComputedStyle(el).translate)).toBe('none');
  expect(await link.locator('.btn-circle').evaluate((el) => getComputedStyle(el).translate)).toBe(
    'none',
  );
});
