import { expect, test } from '../support/users';

// The home Collections carousel (apps/web/components/carousel): native swipe, arrows, dots and
// mouse drag. New Arrivals is a ring now (circle-gallery.spec.ts).
const scrollLeft = (el: HTMLElement) => el.scrollLeft;

test('the page never scrolls sideways, and phones swipe without arrows', async ({ page }) => {
  await page.goto('/');
  const row = page.getByRole('region', { name: 'Collections', exact: true });
  await row.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const next = row.getByRole('button', { name: 'Next' });
  // Arrows from tablet width (768px) up, when the row scrolls at all; phones swipe.
  if (page.viewportSize()!.width < 768) await expect(next).toBeHidden();
});

test.describe('on a laptop', () => {
  test.skip(({ isMobile }) => isMobile, 'Arrows and mouse drag are for desktop.');

  // With three collections the row scrolls up to laptop width, not at it: test at tablet width.
  test.beforeEach(async ({ page }) => page.setViewportSize({ width: 800, height: 900 }));

  test('Next moves the row on by a card and turns Previous on', async ({ page }) => {
    await page.goto('/');
    const row = page.getByRole('region', { name: 'Collections', exact: true });
    await row.scrollIntoViewIfNeeded();
    const track = row.getByRole('list');
    await expect(row.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await row.getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => track.evaluate(scrollLeft)).toBeGreaterThan(100);
    await expect(row.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  test('dragging the row with the mouse scrolls it and never opens a collection', async ({
    page,
  }) => {
    await page.goto('/');
    const row = page.getByRole('region', { name: 'Collections', exact: true });
    await row.scrollIntoViewIfNeeded();
    const track = row.getByRole('list');
    const box = (await row.getByRole('listitem').nth(1).boundingBox())!;
    const y = box.y + box.height / 3;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, y, { steps: 8 });
    await page.mouse.move(box.x + box.width / 2 - 260, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => track.evaluate(scrollLeft)).toBeGreaterThan(100);
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/$/);
  });
});

test('on a phone each carousel shows one whole card at a time', async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 768, 'Tablets and up show two or more.');
  await page.goto('/');
  for (const name of ['Collections']) {
    const track = page.getByRole('region', { name, exact: true }).getByRole('list');
    await track.scrollIntoViewIfNeeded();
    const [trackWidth, slideWidth] = await track.evaluate((el) => [
      el.clientWidth,
      (el.firstElementChild as HTMLElement).getBoundingClientRect().width,
    ]);
    expect(Math.abs(trackWidth! - slideWidth!), name).toBeLessThan(1);
    // One dot per card: the dots count the gaps between cards too.
    const region = page.getByRole('region', { name, exact: true });
    const slides = await region.getByRole('listitem').count();
    await expect(region.getByRole('button', { name: /^Page \d+ of / })).toHaveCount(slides);
  }
});
