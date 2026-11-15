import { expect, test } from '../support/users';

// The navbar from 1024px (the owner's mockup, 2026-11-15): Home, a Collections list and All Suits,
// then search, account, WhatsApp and saved suits. No Menu button there.
test.beforeEach(({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'Phones and tablets use the side panel.');
});

test('the bar has the main links and no Menu button, and marks the page you are on', async ({
  page,
}) => {
  await page.goto('/');
  const bar = page.getByRole('banner');
  await expect(bar.getByRole('button', { name: 'Menu' })).toBeHidden();
  const nav = bar.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await expect(bar.getByRole('link', { name: 'Saved suits' })).toHaveAttribute(
    'href',
    '/account#saved',
  );
});

test('Collections opens by keyboard, closes on Esc, and takes you to a collection', async ({
  page,
}) => {
  await page.goto('/');
  const nav = page.getByRole('banner').getByRole('navigation', { name: 'Primary' });
  const button = nav.getByRole('button', { name: 'Collections' });
  await button.focus();
  await page.keyboard.press('Enter');
  const list = nav.getByRole('list', { name: 'Collections' });
  await expect(list).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(button).toBeFocused();

  await button.click();
  await list.getByRole('link', { name: 'Khaddar' }).click();
  await expect(page).toHaveURL(/\/collections\/khaddar$/);
  await expect(nav.getByRole('button', { name: 'Collections' })).toHaveAttribute(
    'data-active',
    'true',
  );
});
