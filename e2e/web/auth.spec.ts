import { AFTER_SIGN_IN, expect, test } from '../support/users';

test.describe('sign-up, login and logout', () => {
  test('register says to check email', async ({ page, users }) => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ayesha');
    await page.getByLabel('Email').fill(users.freshEmail());
    await page.getByLabel('Password', { exact: true }).fill('a long new passphrase');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('status')).toContainText('Check your email');
  });

  test('register checks the password length before sending', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ayesha');
    await page.getByLabel('Email').fill('ayesha@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 10 characters')).toBeVisible();
  });

  test('a customer logs in, sees the account page, and logs out', async ({ page, users }) => {
    const customer = await users.create();
    await page.goto('/login');
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password', { exact: true }).fill(customer.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/account$/, AFTER_SIGN_IN);
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
    await expect(page.getByText(customer.email)).toBeVisible();

    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a wrong password and an unknown email get the same message', async ({ page, users }) => {
    const customer = await users.create();
    const messageFor = async (email: string) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('not the right password');
      await page.getByRole('button', { name: 'Log in' }).click();
      const alert = page.getByRole('alert').filter({ hasText: /\S/ });
      await expect(alert).toBeVisible();
      return alert.textContent();
    };
    const wrongPassword = await messageFor(customer.email);
    const unknownEmail = await messageFor(users.freshEmail());
    expect(wrongPassword).toBe('Email or password is incorrect.');
    expect(unknownEmail).toBe(wrongPassword);
  });

  // The owner's NEWLOGIN.png (2026-11-22).
  test('the login page has our logo, the welcome line, the password eye and both links', async ({
    page,
  }) => {
    await page.goto('/login');
    const main = page.getByRole('main');
    await expect(main.getByRole('img', { name: 'MA Apparels by Mustafa Ahmed' })).toBeVisible();
    await expect(main.getByText('Welcome back to MA Apparels by Mustafa Ahmed.')).toBeVisible();
    const password = main.getByLabel('Password', { exact: true });
    await password.fill('secret words');
    await main.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(main.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    await expect(main.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  test('the account page sends a signed-out visitor to log in', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
  });

  test('auth pages tell search engines to stay away', async ({ page }) => {
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
    }
  });
});
