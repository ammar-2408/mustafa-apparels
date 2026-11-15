import { expect, test } from '../support/users';

// Home and menu motion (apps/web/app/motion.css): CSS only, off with reduced motion.
const animationName = (el: Element) => getComputedStyle(el).animationName;

test.describe('with motion allowed', () => {
  // These open the side panel, which is for phones and tablets.
  test.use({ viewport: { width: 390, height: 844 } });
  test.use({ reducedMotion: 'no-preference' });

  test('the hero headline rises once, and the menu slides in with its rows one by one', async ({
    page,
  }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    expect(await h1.evaluate(animationName)).toBe('hero-rise');
    expect(await h1.evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe('1');

    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    const panel = page.getByRole('dialog', { name: 'Menu' });
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain(
      'translate',
    );
    const rows = panel.locator('.menu-item');
    expect(await rows.nth(1).evaluate(animationName)).toBe('menu-item-in');
    const delays = await rows.evaluateAll((items) =>
      items.map((li) => parseFloat(getComputedStyle(li).animationDelay)),
    );
    // Each row starts about 25ms after the one before it.
    expect(delays[2]! - delays[1]!).toBeCloseTo(0.025, 3);
    // It ends in place, fully shown.
    await expect
      .poll(() => panel.evaluate((el) => getComputedStyle(el).translate))
      .toMatch(/^(none|0px)$/);
  });
});

test.describe('with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.use({ reducedMotion: 'reduce' });

  test('nothing moves: no headline rise, no sway, no menu slide', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    expect(await h1.evaluate(animationName)).toBe('none');
    expect(await page.locator('.sway').first().evaluate(animationName)).toBe('none');

    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    const panel = page.getByRole('dialog', { name: 'Menu' });
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => getComputedStyle(el).translate)).toBe('none');
    expect(await panel.locator('.menu-item').nth(1).evaluate(animationName)).toBe('none');
  });
});

test.describe('section headings', () => {
  test('rise into view once they are scrolled to', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const heading = page.locator('#collections-title');
    await expect(heading).not.toHaveClass(/is-shown/);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toHaveClass(/is-shown/);
    await expect.poll(() => heading.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('are simply there with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const heading = page.locator('#collections-title');
    expect(await heading.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});

test('on a laptop, a new arrival lifts 3px on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Phones have no hover.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const card = page.locator('#new-arrivals article').first();
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).translate)).toBe('0px -3px');
});

test.describe('blocks across the page', () => {
  test('How to Order steps and the footer columns reveal as they come into view', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const step = page.locator('.step-card').last();
    await expect(step).not.toHaveClass(/is-shown/);
    await step.scrollIntoViewIfNeeded();
    await expect(step).toHaveClass(/is-shown/);
    const column = page.getByRole('contentinfo').locator('.reveal').last();
    await column.scrollIntoViewIfNeeded();
    await expect(column).toHaveClass(/is-shown/);
    await expect.poll(() => column.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('the footer reveals on other pages too', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/shop');
    const column = page.getByRole('contentinfo').locator('.reveal').first();
    await column.scrollIntoViewIfNeeded();
    await expect(column).toHaveClass(/is-shown/);
  });

  test('nothing is hidden with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const opacities = await page
      .locator('.reveal')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.every((o) => o === '1')).toBe(true);
  });
});
