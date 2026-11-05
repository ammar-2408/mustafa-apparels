import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

test('customers are listed read-only and found by email; admins are not listed', async ({
  page,
  users,
}) => {
  const customer = await users.create({ role: 'customer' });
  const admin = await loginAsAdmin(page, users);

  await page.goto(`/customers?q=${encodeURIComponent(customer.email)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible();
  await expect(page.getByText('1 customer', { exact: true })).toBeVisible();
  await expect(page.getByText(customer.email).filter({ visible: true })).toBeVisible();

  // Nothing here changes an account.
  const main = page.getByRole('main');
  await expect(main.getByRole('button', { name: /ban|block|delete|admin|role/i })).toHaveCount(0);

  await page.goto(`/customers?q=${encodeURIComponent(admin.email)}`);
  await expect(page.getByText('No customers match.')).toBeVisible();
});
