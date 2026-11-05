import { product } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { createDraftSuit, deleteSuits, type DraftSuit, suitById } from '../support/suits';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
// A long flow of saves against the Neon dev branch (docs/debugging.md).
test.describe.configure({ timeout: 120_000 });

let suit: DraftSuit;
const extra: string[] = [];

test.beforeEach(async ({ db }) => {
  suit = await createDraftSuit(db, {
    price: null,
    mainColor: 'Black',
    colorFamily: 'Black',
    attributes: { checks: ['Confirm the trouser fabric'] },
  });
});

test.afterEach(async ({ db }) => {
  await deleteSuits(db, [suit.id, ...extra.splice(0)]);
});

test('publishing lists what is missing; once fixed it publishes, unpublishes, archives and restores', async ({
  page,
  users,
  db,
}) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);
  await expect(page.getByText('Draft: not on the shop.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open checks (1)' })).toBeVisible();

  // Everything missing, at once, each linked to where it is fixed.
  await page.getByRole('button', { name: 'Publish' }).click();
  const problems = page.getByText('Not published yet. Fix these first:').locator('..');
  await expect(problems.getByRole('link', { name: 'Price (Rs)' })).toBeVisible();
  await expect(problems.getByRole('link', { name: 'Photos' })).toBeVisible();
  await expect(problems.getByRole('link', { name: 'Open checks' })).toBeVisible();

  // Fix each one: a price, a photo with alt text, the check.
  await page.getByLabel('Price (Rs)', { exact: true }).fill('4500');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();

  await page.getByLabel(/add photos or videos/i).setInputFiles({
    name: 'front.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(4096, 1),
  });
  const upload = page.getByRole('list', { name: 'New uploads' }).getByRole('listitem');
  await upload.getByLabel('Alt text').fill('Black embroidered suit, front view');
  await upload.getByRole('button', { name: 'Save photo' }).click();
  await expect(page.getByText('Main', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Mark cleared: Confirm the trouser fabric' }).click();
  await expect(page.getByRole('heading', { name: /Open checks/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Published: on the shop.')).toBeVisible();
  await expect.poll(async () => (await suitById(db, suit.id))?.status).toBe('published');

  await page.getByRole('button', { name: 'Unpublish' }).click();
  await expect(page.getByText('Draft: not on the shop.')).toBeVisible();

  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText(/^Archived/)).toBeVisible();
  await page.getByRole('button', { name: 'Restore as draft' }).click();
  await expect(page.getByText('Draft: not on the shop.')).toBeVisible();
  await expect.poll(async () => (await suitById(db, suit.id))?.status).toBe('draft');
});

test('duplicate opens a draft copy without the design code', async ({ page, users, db }) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page).not.toHaveURL(new RegExp(`/suits/${suit.id}$`), { timeout: 15_000 });
  const copyId = page.url().split('/').at(-1)!;
  extra.push(copyId);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('(copy)');
  await expect(page.getByText('No design code')).toBeVisible();
  const [copy] = await db.select().from(product).where(eq(product.id, copyId));
  expect(copy).toMatchObject({ status: 'draft', designCode: null });
});
