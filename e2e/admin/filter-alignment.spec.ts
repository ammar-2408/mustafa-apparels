// The search boxes have a hint underneath. The button and the other filters must line up with the
// box itself, not with the hint (owner's review, 2026-11-05).
import type { Locator } from '@playwright/test';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error('not visible');
  return found;
}

test('the Search button lines up with the customer search box, or sits under it', async ({
  page,
  users,
}) => {
  await loginAsAdmin(page, users);
  await page.goto('/customers');
  const input = await box(page.getByRole('searchbox', { name: 'Search' }));
  const button = await box(page.getByRole('button', { name: 'Search', exact: true }));
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    expect(Math.abs(button.y - input.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(button.height - input.height)).toBeLessThanOrEqual(1);
  } else {
    expect(button.y).toBeGreaterThan(input.y + input.height);
  }
});

test('the suit search box and both filters start on one line on wide screens', async ({
  page,
  users,
}) => {
  await loginAsAdmin(page, users);
  await page.goto('/suits');
  const input = await box(page.getByRole('searchbox', { name: 'Search' }));
  const status = await box(page.getByLabel('Status'));
  const collection = await box(page.getByLabel('Collection'));
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    expect(Math.abs(status.y - input.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(collection.y - input.y)).toBeLessThanOrEqual(1);
  } else {
    expect(status.y).toBeGreaterThan(input.y + input.height);
  }
});
