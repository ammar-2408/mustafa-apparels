import { expect, randomIp, test } from '../support/users';

const signIn = (
  request: import('@playwright/test').APIRequestContext,
  body: { email: string; password: string },
  ip?: string,
) =>
  request.post('/api/auth/sign-in/email', {
    data: body,
    headers: {
      origin: 'http://localhost:3000',
      ...(ip && { 'x-nf-client-connection-ip': ip }),
    },
  });

test.describe('login rate limits', () => {
  test('the 6th wrong password for one email gets 429, with the generic message', async ({
    page,
    users,
  }) => {
    const customer = await users.create();
    for (let i = 0; i < 5; i++) {
      const response = await signIn(page.request, { email: customer.email, password: 'wrong one' });
      expect(response.status()).toBe(401);
    }
    const blocked = await signIn(page.request, {
      email: customer.email,
      password: customer.password,
    });
    expect(blocked.status()).toBe(429);
    expect(await blocked.json()).toMatchObject({
      message: 'Too many attempts. Please try again in a few minutes.',
    });

    // Another account from another address is unaffected.
    const other = await users.create();
    const fine = await signIn(
      page.request,
      { email: other.email, password: other.password },
      randomIp(),
    );
    expect(fine.status()).toBe(200);
  });

  test('the login form shows the limit in plain words', async ({ page, users }) => {
    const customer = await users.create();
    for (let i = 0; i < 5; i++) {
      await signIn(page.request, { email: customer.email, password: 'wrong one' });
    }
    await page.goto('/login');
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password').fill(customer.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Too many attempts. Please try again in a few minutes.',
    );
  });
});

test('sign-up refuses a password known from a data breach', async ({ page, users }) => {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Ayesha');
  await page.getByLabel('Email').fill(users.freshEmail());
  // One of the mock list's breached passwords (packages/core/integrations/breached-passwords.ts).
  await page.getByLabel('Password').fill('password1234');
  await expect(page.getByText('Password strength: Weak')).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'appeared in a data breach',
  );
});
