import { linkFromEmail } from '../support/outbox';
import { AFTER_SIGN_IN, expect, test } from '../support/users';

const NEW_PASSWORD = 'e2e a brand new passphrase';

test.describe('email verification and password reset', () => {
  test('sign up, confirm the email from the link, and land on the account page', async ({
    page,
    users,
  }) => {
    const email = users.freshEmail();
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ayesha');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('e2e correct horse battery');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('status')).toContainText('Check your email');

    await page.goto(await linkFromEmail(email, 'verify-email'));
    await expect(page).toHaveURL(/\/account$/, AFTER_SIGN_IN);
    await expect(page.getByText(email)).toBeVisible();
  });

  test('logging in before confirming asks to verify and sends a new link', async ({
    page,
    users,
  }) => {
    const customer = await users.create({ verified: false });
    await page.goto('/login');
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password', { exact: true }).fill(customer.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    // Inside main: Next's route announcer is an alert too.
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      "Please verify your email first. We've sent you a new link.",
    );
    expect(await linkFromEmail(customer.email, 'verify-email')).toContain('/api/auth/verify-email');
  });

  test('reset the password from the emailed link, once', async ({ page, users }) => {
    const customer = await users.create();
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot your password?' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Forgot your password' }),
    ).toBeVisible();
    // A role query: the login page stays mounted but hidden after the client-side move (ADR-021).
    await page.getByRole('textbox', { name: 'Email' }).fill(customer.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toContainText('If an account uses that email');

    const link = await linkFromEmail(customer.email, 'reset-password');
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await page.getByLabel('New password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByRole('status')).toContainText('Your password is changed');

    await page.goto('/login');
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password', { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/account$/, AFTER_SIGN_IN);

    // The same link can't be used again.
    await page.goto(link);
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'expired or was already used',
    );
  });
});
