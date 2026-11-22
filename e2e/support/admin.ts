// A signed-in admin for specs past the login page. Runs the real flow (password, then 2FA set up
// with a TOTP code), so every admin spec also proves the gate still lets an admin in.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { totp } from './totp';
import { AFTER_SIGN_IN, type TestUser, type Users } from './users';

export const ADMIN_URL = 'http://localhost:3001';

export type SignedInAdmin = TestUser & { secret: string };

export async function loginAsAdmin(page: Page, users: Users): Promise<SignedInAdmin> {
  const admin = await users.create({ role: 'admin' });
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/setup-2fa$/, AFTER_SIGN_IN);
  await page.getByLabel('Your password').fill(admin.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  const secret = ((await page.getByTestId('totp-secret').textContent()) ?? '').trim();
  await page.getByLabel('Code from your app').fill(totp(secret));
  await page.getByRole('button', { name: 'Turn on 2FA' }).click();
  // Several database round trips; generous for a busy machine on the Neon dev branch.
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible({
    timeout: 15_000,
  });
  return { ...admin, secret };
}

// On phones the sidebar sits behind the Menu button; on wider screens this does nothing.
export async function openAdminMenu(page: Page) {
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) await menu.click();
}
