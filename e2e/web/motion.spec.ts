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

test('on a laptop, the front suit in the New Arrivals ring lifts 4px on hover', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Phones have no hover.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const card = page.locator('#new-arrivals li[data-front="true"] a');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await card.hover();
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).translate)).toBe('0px -4px');
});

test.describe('blocks across the page', () => {
  test('How to Order steps and the footer columns reveal as they come into view', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    // The reveal sits on each step's list item; the card inside it does the hover fill.
    const step = page.locator('section[aria-labelledby="order-title"] li.reveal').last();
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

// Owner, 2026-11-17: the hero's two buttons fill with colour on hover, closing in from the edge.
test.describe('hero buttons', () => {
  test('fill on hover: ink over See All Suits, deep green over WhatsApp Us', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Phones have no hover.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const hero = page.locator('section').first();
    const fill = (name: RegExp) =>
      hero.getByRole('link', { name }).evaluate((el) => getComputedStyle(el, '::before').boxShadow);
    const colour = (name: RegExp) =>
      hero.getByRole('link', { name }).evaluate((el) => getComputedStyle(el).color);

    for (const [name, rgb] of [
      [/See All Suits/, 'rgb(17, 17, 17)'],
      [/WhatsApp Us/, 'rgb(22, 74, 69)'],
    ] as const) {
      expect(await fill(name)).toBe('none');
      await hero.getByRole('link', { name }).hover();
      await expect.poll(() => fill(name)).toContain(rgb);
      await expect.poll(() => colour(name)).toBe('rgb(255, 255, 255)');
    }
  });

  test('fill at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const button = page
      .locator('section')
      .first()
      .getByRole('link', { name: /See All Suits/ });
    expect(await button.evaluate((el) => getComputedStyle(el, '::before').transitionDuration)).toBe(
      '0s',
    );
  });
});

test.describe('How to Order cards', () => {
  test('fill with deep green from the bottom on hover, and the text turns white', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Phones have no hover.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const card = page.locator('.step-card').first();
    await card.scrollIntoViewIfNeeded();
    const fill = () => card.evaluate((el) => getComputedStyle(el, '::before').scale);
    expect(await fill()).toBe('1 0');
    // The fill grows from the bottom edge: its origin's y is the card's height (inside the 1px border).
    const [, originY] = await card.evaluate((el) =>
      getComputedStyle(el, '::before').transformOrigin.split(' ').map(parseFloat),
    );
    const height = await card.evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.abs(originY! - height)).toBeLessThanOrEqual(2.5);
    await card.hover();
    await expect.poll(fill).toBe('1');
    await expect
      .poll(() => card.locator('h3').evaluate((el) => getComputedStyle(el).color))
      .toBe('rgb(255, 255, 255)');
  });

  test('change colour at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const card = page.locator('.step-card').first();
    expect(await card.evaluate((el) => getComputedStyle(el, '::before').transitionDuration)).toBe(
      '0s',
    );
  });
});
