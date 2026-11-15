import { randomUUID } from 'node:crypto';

import { auditLog, user } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { createDraftSuit, deleteSuits, type DraftSuit } from '../support/suits';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

let suit: DraftSuit;

test.beforeEach(async ({ db }) => {
  suit = await createDraftSuit(db, { price: null });
});

test.afterEach(async ({ db }) => {
  await deleteSuits(db, [suit.id]);
});

test('a suit edit shows in the log with who made it and the before and after', async ({
  page,
  users,
}) => {
  const admin = await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);
  await page.getByLabel('Price (Rs)', { exact: true }).fill('4999');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  // The form then refreshes the page in the background; a goto during it is cancelled.
  await page.waitForLoadState('networkidle');

  // Filtered to this admin by id (every E2E admin has the same name), so other workers' changes
  // don't get in the way. The filter form sends the same two parameters.
  await page.goto(`/audit?entity=product&actor=${admin.id}`);
  await expect(page.getByLabel('What')).toHaveValue('product');
  await expect(page.getByLabel('Who')).toHaveValue(admin.id);

  const entry = page.getByRole('listitem').filter({ hasText: 'product.update' }).first();
  await expect(entry).toContainText(admin.name);
  await expect(entry.getByRole('link', { name: `Suit · ${suit.name}` })).toHaveAttribute(
    'href',
    `/suits/${suit.id}`,
  );
  await entry.getByText('Before and after').click();
  await expect(entry.locator('pre')).toContainText('"price": 4999');
});

test('rows from removed accounts are hidden unless asked for', async ({ page, users, db }) => {
  await loginAsAdmin(page, users);
  const marker = `removed-${randomUUID().slice(0, 8)}`;
  const [gone] = await db
    .insert(user)
    .values({ name: 'E2E Gone', email: users.freshEmail(), role: 'admin' })
    .returning();
  await db.insert(auditLog).values({
    actorId: gone!.id,
    action: 'product.update',
    entity: 'product',
    entityId: suit.id,
    changes: { marker },
  });
  await db.delete(user).where(eq(user.id, gone!.id));

  await page.goto('/audit?entity=product');
  await expect(page.getByLabel('Show removed accounts')).not.toBeChecked();
  await expect(page.getByText(marker)).toHaveCount(0);

  await page.getByLabel('Show removed accounts').check();
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page).toHaveURL(/removed=1/);
  const entry = page.getByRole('listitem').filter({ hasText: marker });
  await expect(entry).toContainText('A removed account');
});
