import { expect, test } from '../support/users';

// The side-panel menu (docs/design.md §9.1, step 6.1): the native modal dialog keeps Tab inside,
// Esc closes it, focus goes back to the menu button, and the page behind doesn't scroll.
// The side panel is for phones and tablets: from 1024px the links sit in the navbar instead.
test.use({ viewport: { width: 390, height: 844 } });

test.describe('side-panel menu', () => {
  test('opens with the collections first, keeps focus inside, and closes on Esc', async ({
    page,
  }) => {
    await page.goto('/');
    const button = page.getByRole('banner').getByRole('button', { name: 'Menu' });
    await button.click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    const links = menu.getByRole('navigation', { name: 'Main' }).getByRole('link');
    await expect(links.first()).toHaveText('New arrivals');
    await expect(menu.getByRole('link', { name: 'Dhanak' })).toHaveAttribute(
      'href',
      '/collections/dhanak',
    );
    await expect(menu.getByRole('link', { name: 'WhatsApp us' })).toBeVisible();

    // More presses than the panel has controls: focus never lands on the page behind.
    const count = await menu.locator('a, button').count();
    for (let i = 0; i < count + 3; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const active = document.activeElement;
        return !active || active === document.body || Boolean(active.closest('dialog'));
      });
      expect(inside).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('the page behind does not scroll while it is open', async ({ page, isMobile }) => {
    await page.goto('/');
    // A stylesheet, not an attribute: React would see a changed attribute as a hydration mismatch.
    await page.addStyleTag({ content: 'main { min-height: 400vh }' });
    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    // The page itself can't scroll while the dialog is open...
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    );
    // ...and the wheel and keys don't move it (mobile WebKit has no wheel in Playwright).
    if (!isMobile) {
      await page.mouse.move(10, 400);
      await page.mouse.wheel(0, 1500);
    }
    await page.keyboard.press('PageDown');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('a link closes it and goes to the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    await page
      .getByRole('dialog', { name: 'Menu' })
      .getByRole('link', { name: 'All suits' })
      .click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });
});

test('the floating bar takes over once the header scrolls away', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({ content: 'main { min-height: 400vh }' });
  // Not the mouse wheel: mobile WebKit has none in Playwright.
  await page.evaluate(() => window.scrollTo(0, 800));
  const bar = page.locator('[data-floating="true"]');
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('link', { name: 'Mustafa Apparels home' })).toBeVisible();
  await expect(bar.getByRole('img', { name: 'MA Apparels' })).toHaveAttribute(
    'src',
    /simplified-black\.svg$/,
  );
});

test('the skip link jumps to the main content', async ({ page, browserName }) => {
  await page.goto('/');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  if (browserName === 'webkit') {
    // Safari's Tab skips links unless the user turns that on, so check the skip link is the first
    // thing Tab would reach, then use it.
    expect(
      await page.evaluate(
        () => document.querySelector('a[href], button, input, select, textarea')?.textContent,
      ),
    ).toBe('Skip to content');
    await skip.focus();
  } else {
    await page.keyboard.press('Tab');
  }
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});
