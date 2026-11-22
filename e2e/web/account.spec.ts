import { inquiry, product } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { AFTER_SIGN_IN, expect, test } from '../support/users';

// The account page (docs/prd.md W7–W9).
async function logIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/account$/, AFTER_SIGN_IN);
}

test('a guest tapping a heart is asked to log in', async ({ page }) => {
  await page.goto('/shop');
  await page
    .getByRole('main')
    .getByRole('button', { name: /^Save / })
    .first()
    .click();
  const prompt = page.getByRole('dialog', { name: 'Save suits you like' });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
});

test('a customer saves a suit, sees it and their questions, then removes it', async ({
  page,
  users,
  db,
}) => {
  const customer = await users.create();
  await logIn(page, customer.email, customer.password);

  await page.goto('/shop');
  const heart = page
    .getByRole('main')
    .getByRole('button', { name: /^Save / })
    .first();
  const name = (await heart.getAttribute('aria-label'))!.replace(/^Save /, '');
  await heart.click();
  await expect(
    page.getByRole('main').getByRole('button', { name: `Saved: ${name}. Tap to remove` }),
  ).toHaveAttribute('aria-pressed', 'true');

  const [suit] = await db.select({ id: product.id }).from(product).where(eq(product.name, name));
  await db.insert(inquiry).values({
    userId: customer.id,
    productId: suit!.id,
    name: 'Ayesha',
    phone: '+923001234567',
    message: 'Is this in stock?',
  });

  await page.goto('/account');
  const saved = page.getByRole('region', { name: 'Saved suits' });
  await expect(saved.getByRole('heading', { name })).toBeVisible();
  const questions = page.getByRole('region', { name: 'Your questions' });
  await expect(questions).toContainText('Is this in stock?');
  await expect(questions).toContainText('Sent');

  await saved.getByRole('button', { name: `Remove ${name}` }).click();
  await expect(saved).toContainText('Tap the heart on any suit');
});

test('a customer changes their details', async ({ page, users }) => {
  const customer = await users.create();
  await logIn(page, customer.email, customer.password);
  const details = page.getByRole('region', { name: 'Your details' });
  await details.getByRole('textbox', { name: 'Name' }).fill('Ayesha Khan');
  await details.getByRole('textbox', { name: 'Phone or WhatsApp' }).fill('0300 1234567');
  await details.getByRole('button', { name: 'Save changes' }).click();
  await expect(details.getByRole('status')).toHaveText('Saved.');
  await page.reload();
  await expect(details.getByRole('textbox', { name: 'Phone or WhatsApp' })).toHaveValue(
    '+923001234567',
  );
});

test('a customer deletes their account with their password, and can no longer log in', async ({
  page,
  users,
}) => {
  const customer = await users.create();
  await logIn(page, customer.email, customer.password);
  await page.getByRole('region', { name: 'Delete your account' }).getByRole('button').click();
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  await dialog.getByLabel('Your password').fill('not the password');
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(dialog.getByText('That password is not right')).toBeVisible();

  await dialog.getByLabel('Your password').fill(customer.password);
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/\?account=deleted$/, AFTER_SIGN_IN);

  await page.goto('/account');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('textbox', { name: 'Email' }).fill(customer.email);
  await page.getByLabel('Password', { exact: true }).fill(customer.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('main').getByRole('alert')).not.toBeEmpty();
});
