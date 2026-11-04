import { randomUUID } from 'node:crypto';

import { category, slugRedirect } from '@mustafa/db/schema';
import { eq, inArray, like, or } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });

// Collections this spec made. Reordering isn't driven here: it needs every collection, and
// parallel workers add their own (the action and component tests cover it).
const PREFIX = 'e2e-col-';
// Only this test's own rows: a parallel test may still be using its collection.
const tags: string[] = [];
const newTag = () => {
  const tag = randomUUID().slice(0, 8);
  tags.push(tag);
  return tag;
};

test.afterEach(async ({ db }) => {
  const created = tags.splice(0);
  if (created.length === 0) return;
  const mine = await db
    .select({ id: category.id })
    .from(category)
    .where(or(...created.map((tag) => like(category.slug, `${PREFIX}${tag}%`))));
  if (mine.length === 0) return;
  const ids = mine.map((row) => row.id);
  await db.delete(slugRedirect).where(inArray(slugRedirect.targetId, ids));
  await db.delete(category).where(inArray(category.id, ids));
});

test('create, rename with a redirect, hide and show a collection', async ({ page, users, db }) => {
  const tag = newTag();
  const name = `E2E Col ${tag}`;
  await loginAsAdmin(page, users);

  await page.goto('/collections');
  await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible();
  await page.getByRole('link', { name: 'New collection' }).click();
  await page.getByLabel('Name').fill(name);
  await expect(page.getByLabel('Web address')).toHaveValue(`${PREFIX}${tag}`);
  await page.getByLabel('Description', { exact: true }).fill('Winter suits in khaddar.');
  await page.getByRole('button', { name: 'Create collection' }).click();

  await expect(page).toHaveURL(/\/collections$/);
  const row = page.getByRole('listitem').filter({ hasText: name });
  await expect(row).toContainText('0 suits');

  // Rename: the old address keeps working through a redirect row.
  await row.getByRole('link', { name }).click();
  await page.getByLabel('Name').fill(`${name} Winter`);
  await page.getByLabel('Web address').fill(`${PREFIX}${tag}-winter`);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/collections$/);
  const [saved] = await db
    .select()
    .from(category)
    .where(eq(category.slug, `${PREFIX}${tag}-winter`));
  expect(saved?.name).toBe(`${name} Winter`);
  const redirects = await db
    .select()
    .from(slugRedirect)
    .where(eq(slugRedirect.oldSlug, `${PREFIX}${tag}`));
  expect(redirects.map((r) => r.targetId)).toEqual([saved?.id]);

  // Hide, then show again.
  const renamed = page.getByRole('listitem').filter({ hasText: `${name} Winter` });
  await renamed.getByRole('button', { name: `Hide ${name} Winter` }).click();
  await expect(renamed.getByText('Hidden', { exact: true })).toBeVisible();
  await renamed.getByRole('button', { name: `Show ${name} Winter` }).click();
  await expect(renamed.getByText('Hidden', { exact: true })).toHaveCount(0);
});

test('a brand name or a taken address is refused on its field', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  await page.goto('/collections/new');
  await page.getByLabel('Name').fill('Khaadi Lawn');
  await page.getByRole('button', { name: 'Create collection' }).click();
  await expect(page.getByText(/remove the brand name/i).first()).toBeVisible();

  await page.getByLabel('Name').fill('Dhanak copy');
  await page.getByLabel('Web address').fill('dhanak');
  await page.getByRole('button', { name: 'Create collection' }).click();
  await expect(page.getByText('Another collection already uses this slug')).toBeVisible();
});
