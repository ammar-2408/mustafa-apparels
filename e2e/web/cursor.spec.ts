import { expect, test } from '../support/users';

// The owner (2026-11-22): everything that can be clicked shows the hand. Tailwind's own base gives
// buttons the plain arrow, so the theme puts the hand back (packages/config/tailwind/theme.css).
const cursorOf = (locator: import('@playwright/test').Locator) =>
  locator.evaluate((el) => getComputedStyle(el).cursor);

test('buttons, links, questions and form controls show the hand', async ({ page }) => {
  await page.goto('/');
  const header = page.getByRole('banner');
  expect(await cursorOf(header.getByRole('button', { name: 'Search' }))).toBe('pointer');
  expect(await cursorOf(header.getByRole('link', { name: 'Mustafa Apparels home' }))).toBe(
    'pointer',
  );
  if (page.viewportSize()!.width >= 1024) {
    expect(await cursorOf(header.getByRole('button', { name: 'Collections' }))).toBe('pointer');
  } else {
    expect(await cursorOf(header.getByRole('button', { name: /Menu/ }))).toBe('pointer');
  }

  await page.goto('/faq');
  expect(await cursorOf(page.getByRole('main').locator('summary').first())).toBe('pointer');

  await page.goto('/shop');
  expect(await cursorOf(page.getByRole('main').getByRole('combobox').first())).toBe('pointer');

  await page.goto('/login');
  expect(await cursorOf(page.getByRole('button', { name: 'Log in' }))).toBe('pointer');
  expect(await cursorOf(page.getByRole('button', { name: 'Show password' }))).toBe('pointer');
});

test('a disabled button says it cannot be used', async ({ page }) => {
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Log in' });
  await button.evaluate((el) => el.setAttribute('disabled', ''));
  expect(await cursorOf(button)).toBe('not-allowed');
});
