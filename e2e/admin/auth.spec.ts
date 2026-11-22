import { AFTER_SIGN_IN, expect, test } from '../support/users';

test.use({ baseURL: 'http://localhost:3001' });

test.describe('admin login', () => {
  test('the login page renders and stays out of search engines', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
    await expect(page).toHaveTitle('Log in | Mustafa Apparels Admin');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  test('a customer with the right password gets the generic message', async ({ page, users }) => {
    const customer = await users.create();
    await page.goto('/login');
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password', { exact: true }).fill(customer.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Email or password is incorrect.',
    );
    expect((await page.context().cookies()).map((c) => c.name)).not.toContain(
      'ma-admin.session_token',
    );
  });

  test('an admin signs in with a host-only admin cookie', async ({ page, users }) => {
    const admin = await users.create({ role: 'admin' });
    await page.goto('/login');
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password', { exact: true }).fill(admin.password);
    const signIn = page.waitForResponse('**/api/auth/sign-in/email');
    await page.getByRole('button', { name: 'Log in' }).click();
    // Sign-in, then the first admin page, can take more than 5s on a cold dev server.
    await expect(page).not.toHaveURL(/\/login$/, AFTER_SIGN_IN);

    // The header the server sent: Playwright's WebKit on Windows and Linux reports every
    // cookie's SameSite as None in its cookie store, whatever the server said.
    const setCookie = (await (await signIn).headerValues('set-cookie')).find((c) =>
      c.startsWith('ma-admin.session_token='),
    );
    expect(setCookie).toMatch(/; HttpOnly/i);
    expect(setCookie).toMatch(/; SameSite=Lax/i);
    expect(setCookie).not.toMatch(/; Domain=/i);

    const cookie = (await page.context().cookies()).find(
      (c) => c.name === 'ma-admin.session_token',
    );
    expect(cookie).toMatchObject({ domain: 'localhost', httpOnly: true });
  });
});
