import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { createDraftSuit, deleteSuits, type DraftSuit } from '../support/suits';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

let priced: DraftSuit;
let unpriced: DraftSuit;

test.beforeEach(async ({ db }) => {
  priced = await createDraftSuit(db, { price: 4500 });
  unpriced = await createDraftSuit(db, { price: null });
});

test.afterEach(async ({ db }) => {
  await deleteSuits(db, [priced.id, unpriced.id]);
});

// Each suit's name ends with its own tag, so a search for the tag finds only this test's suits.
const tagOf = (suit: DraftSuit) => suit.name.split(' ').at(-1)!;

test('search, the needs-price filter and the empty state', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  await page.goto('/suits');
  await expect(page.getByRole('heading', { level: 1, name: 'Suits' })).toBeVisible();

  const results = page.getByRole('main');
  await page.getByLabel('Search').fill(tagOf(priced));
  await page.getByRole('button', { name: 'Show suits' }).click();
  await expect(page).toHaveURL(new RegExp(`q=${tagOf(priced)}`));
  await expect(results.getByText('1 suit match')).toBeVisible();
  await expect(
    results.getByRole('link', { name: priced.name }).filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(results.getByText('Rs 4,500').filter({ visible: true }).first()).toBeVisible();

  // The design code finds a suit too, hyphen or not.
  await page.goto(`/suits?q=${unpriced.designCode.replace('-', '')}`);
  await expect(
    results.getByRole('link', { name: unpriced.name }).filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(results.getByText('Needs price').filter({ visible: true }).first()).toBeVisible();

  // Needs price narrows to suits with no price (each search keeps to this test's own suits).
  await page.goto(`/suits?needsPrice=1&q=${tagOf(unpriced)}`);
  await expect(page.getByRole('checkbox', { name: 'Needs price' })).toBeChecked();
  await expect(
    results.getByRole('link', { name: unpriced.name }).filter({ visible: true }).first(),
  ).toBeVisible();
  await page.goto(`/suits?needsPrice=1&q=${tagOf(priced)}`);
  await expect(results.getByText('No suits match. Try fewer filters.')).toBeVisible();

  await page.goto('/suits?q=zzzz-nothing-matches');
  await expect(results.getByText('No suits match. Try fewer filters.')).toBeVisible();
  await page.getByRole('link', { name: 'Clear' }).click();
  await expect(page).toHaveURL(/\/suits$/);
});

test('a suit in the list opens its edit page', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits?q=${tagOf(priced)}`);
  await page.getByRole('link', { name: priced.name }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/suits/${priced.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: priced.name })).toBeVisible();
});

test('a bad filter in the URL shows the full list instead of an error', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  const response = await page.goto('/suits?status=deleted&page=-1');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Suits' })).toBeVisible();
});
