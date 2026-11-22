import { openAdminMenu } from '../support/admin';
import { AFTER_SIGN_IN, expect, test } from '../support/users';

test.use({ baseURL: 'http://localhost:3001' });

test.describe('admin gate', () => {
  test('a signed-out visitor is sent to log in from every page', async ({ page }) => {
    for (const path of ['/', '/products', '/setup-2fa', '/anything/else']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login$/);
    }
  });

  test('a signed-out API call gets 401, not a page', async ({ request }) => {
    const response = await request.post('http://localhost:3001/api/upload/sign', {
      data: { kind: 'image' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
  });

  test("a storefront session can't open the admin, even under the admin's cookie name", async ({
    page,
    users,
  }) => {
    const customer = await users.create();
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password', { exact: true }).fill(customer.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/account$/, AFTER_SIGN_IN);

    // Same host, different cookie name: the admin doesn't see it.
    await page.goto('/');
    await expect(page).toHaveURL(/3001\/login$/);

    // Copied under the admin's name, it gets past the proxy, and the page itself refuses it.
    const web = (await page.context().cookies()).find((c) => c.name === 'ma.session_token')!;
    await page.context().addCookies([{ ...web, name: 'ma-admin.session_token' }]);
    await page.goto('/');
    await expect(page).toHaveURL(/3001\/login$/);
  });

  test('an admin with 2FA reaches the dashboard and can log out', async ({ page, users }) => {
    const { totp } = await import('../support/totp');
    const admin = await users.create({ role: 'admin' });
    await page.goto('/login');
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByLabel('Your password').fill(admin.password);
    await page.getByRole('button', { name: 'Continue' }).click();
    const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
    await page.getByLabel('Code from your app').fill(totp(secret));
    await page.getByRole('button', { name: 'Turn on 2FA' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await openAdminMenu(page);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });
});
