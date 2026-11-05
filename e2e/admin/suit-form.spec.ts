import { randomUUID } from 'node:crypto';

import { product } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { deleteSuits } from '../support/suits';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

const made: string[] = [];

test.afterEach(async ({ db }) => {
  await deleteSuits(db, made.splice(0));
});

test('fill every section, save as a draft, and find the values on the edit page', async ({
  page,
  users,
  db,
}) => {
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const code = `E2E-${tag}`;
  await loginAsAdmin(page, users);
  await page.goto('/suits');
  await page.getByRole('link', { name: 'New suit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'New suit' })).toBeVisible();

  // Basics
  await page.getByLabel('Name').fill(`E2E Sage Green Printed Khaddar 3-Piece Suit ${tag}`);
  await page.getByLabel('Design code').fill(code);
  await expect(page.getByLabel('Web address')).toHaveValue(
    `e2e-sage-green-printed-khaddar-3-piece-suit-${tag.toLowerCase()}-e2e-${tag.toLowerCase()}`,
  );
  await page.getByLabel('Collection').selectOption({ index: 1 });
  await page.getByLabel('Display tag').fill('Premium');
  // Price: left empty, so the draft needs one later.
  // Filters
  await page.getByLabel('Pieces').selectOption('three_piece');
  await page.getByLabel('Fabric', { exact: true }).selectOption('Khaddar');
  await page.getByRole('checkbox', { name: 'Floral Print' }).check();
  await page.getByRole('checkbox', { name: 'Unstitched Suits' }).check();
  await page.getByLabel('Season').selectOption('winter');
  // Pieces: shirt and trouser only, with the shirt's details.
  await page.getByRole('checkbox', { name: 'Dupatta', exact: true }).uncheck();
  await page.getByLabel('Shirt fabric').fill('Khaddar');
  await page.getByLabel('Shirt finish').fill('Printed');
  await page.getByLabel('Shirt length (m)').fill('3');
  // Colour
  await page.getByLabel('Main colour').fill('Sage Green');
  await page.getByLabel('Colour filter').selectOption('Green');
  await page.getByLabel('Accent colours').fill('cream, rust');
  await page.getByLabel('Motifs').fill('floral border');
  // Description and care
  await page.getByLabel('Description', { exact: true }).fill('Printed khaddar for winter.');
  await page.getByLabel('Care').fill('Dry clean recommended.');
  // Search engines
  await page.getByLabel('Search title').fill('Sage green printed khaddar suit');
  await page.getByRole('button', { name: 'Save as draft' }).click();

  // The edit page of the new suit (not /suits/new itself).
  await expect(page).toHaveURL(/\/suits\/(?!new$)[^/]+$/, { timeout: 15_000 });
  const [row] = await db.select().from(product).where(eq(product.designCode, code));
  made.push(row!.id);
  expect(row).toMatchObject({
    status: 'draft',
    price: null,
    fabric: 'Khaddar',
    design: ['Floral Print'],
    season: 'winter',
    colorFamily: 'Green',
    accentColors: ['cream', 'rust'],
    collectionType: 'Premium',
    pieceDetails: [
      { piece: 'shirt', fabric: 'Khaddar', finish: 'Printed', length_m: 3 },
      { piece: 'trouser' },
    ],
  });

  // The edit page shows the saved values.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    `E2E Sage Green Printed Khaddar 3-Piece Suit ${tag}`,
  );
  await expect(page.getByLabel('Main colour')).toHaveValue('Sage Green');
  await expect(page.getByLabel('Accent colours')).toHaveValue('cream, rust');
  await expect(page.getByRole('checkbox', { name: 'Floral Print' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Dupatta', exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Shirt length (m)')).toHaveValue('3');

  // And saves an edit.
  await page.getByLabel('Price (Rs)', { exact: true }).fill('4500');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await expect
    .poll(async () => (await db.select().from(product).where(eq(product.id, row!.id)))[0]?.price)
    .toBe(4500);
});

test('a brand name or a missing collection is refused on its field', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  await page.goto('/suits/new');
  await page.getByLabel('Name').fill('Baroque Style Lawn Suit');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText(/remove the brand name/i).first()).toBeVisible();
  await expect(page.getByText('Check the highlighted fields.')).toBeVisible();
  await expect(page).toHaveURL(/\/suits\/new$/);
});
