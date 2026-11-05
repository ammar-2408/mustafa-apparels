import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

// Settings are shared by every test and the storefront, and the dev database sits behind Neon's
// connection pooler (no session locks), so these specs never leave a different value behind:
// the first types the seeded WhatsApp number the local way, the second only tries refused values.
// That a different value is written is proven by the action tests (app/(panel)/settings).
const SEEDED_WHATSAPP = '+923482799707';

test('a WhatsApp number typed the local way is saved as +92…', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.getByLabel('WhatsApp number').fill('0348 2799707');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByText('Saved.').first()).toBeVisible();
  // Read back through the app, as the owner sees it after a reload.
  await page.reload();
  await expect(page.getByLabel('WhatsApp number')).toHaveValue(SEEDED_WHATSAPP);
});

test('a landline as WhatsApp or a brand name in delivery text is refused under its field', async ({
  page,
  users,
}) => {
  await loginAsAdmin(page, users);
  await page.goto('/settings');
  await page.getByLabel('WhatsApp number').fill('042 1234567');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(
    page.getByText('Some changes were not saved. See the highlighted fields.'),
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Delivery' }).fill('Delivered as fast as Khaadi orders.');
  await page.getByRole('button', { name: 'Save delivery' }).click();
  await expect(page.getByText(/remove the brand name/i)).toBeVisible();
});
