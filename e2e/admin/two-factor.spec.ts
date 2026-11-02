import { totp } from '../support/totp';
import { expect, test } from '../support/users';

test.use({ baseURL: 'http://localhost:3001' });

test('2FA is set up on the first admin login, then asked for at every login', async ({
  page,
  users,
}) => {
  const admin = await users.create({ role: 'admin' });
  const logIn = async () => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
  };

  // First login: straight to setup, which needs the password again.
  await logIn();
  await expect(page).toHaveURL(/\/setup-2fa$/);
  await page.getByLabel('Your password').fill(admin.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Backup codes' }).getByRole('listitem')).toHaveCount(
    10,
  );
  await page.getByLabel('Code from your app').fill(totp(secret));
  await page.getByRole('button', { name: 'Turn on 2FA' }).click();
  await expect(page).not.toHaveURL(/setup-2fa|login/);

  // A new browser session: the password alone isn't enough.
  await page.context().clearCookies();
  await logIn();
  await expect(page).toHaveURL(/\/login\/verify$/);
  await page.getByLabel('Code from your app').fill(totp(secret) === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'That code didn’t work. Use the newest code from your app.',
  );
  await page.getByLabel('Code from your app').fill(totp(secret));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).not.toHaveURL(/login/);
  expect((await page.context().cookies()).map((c) => c.name)).toContain('ma-admin.session_token');
});

test('the setup page sends a signed-out visitor to log in', async ({ page }) => {
  await page.goto('/setup-2fa');
  await expect(page).toHaveURL(/\/login$/);
});
