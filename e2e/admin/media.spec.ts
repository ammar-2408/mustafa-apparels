import { productMedia } from '@mustafa/db/schema';
import { asc, eq } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { createDraftSuit, deleteSuits, type DraftSuit } from '../support/suits';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });

// Each save is a few database round trips; against the Neon dev branch from a laptop that is about
// 2 s each, so this flow needs more than the default 30 s (CI's local Postgres is far faster).
test.describe.configure({ timeout: 90_000 });

// Uploads go to the admin's mock Cloudinary route (INTEGRATIONS_MODE=mock), which records the
// real file size, so the save-time checks run for real.
const photo = (name: string, bytes = 4096) => ({
  name,
  mimeType: 'image/jpeg',
  buffer: Buffer.alloc(bytes, 1),
});

let suit: DraftSuit;

test.beforeEach(async ({ db }) => {
  suit = await createDraftSuit(db);
});

test.afterEach(async ({ db }) => {
  await deleteSuits(db, [suit.id]);
});

const uploadPhoto = async (
  page: import('@playwright/test').Page,
  name: string,
  alt: string | null,
) => {
  await page.getByLabel(/add photos or videos/i).setInputFiles(photo(name));
  const card = page
    .getByRole('list', { name: 'New uploads' })
    .getByRole('listitem')
    .filter({ hasText: name });
  await expect(card.getByRole('button', { name: 'Save photo' })).toBeEnabled();
  if (alt !== null) await card.getByLabel('Alt text').fill(alt);
  await card.getByRole('button', { name: 'Save photo' }).click();
  return card;
};

const savedRows = (db: Parameters<typeof deleteSuits>[0]) =>
  db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, suit.id))
    .orderBy(asc(productMedia.sortOrder));

test('upload two photos with alt text, reorder, change the main photo and delete one', async ({
  page,
  users,
  db,
}) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);
  await expect(page.getByRole('heading', { level: 1, name: suit.name })).toBeVisible();
  await expect(page.getByText(/needs at least one photo/)).toBeVisible();

  // Alt text is required before a photo is saved.
  const first = await uploadPhoto(page, 'front.jpg', null);
  await expect(first.getByRole('alert')).toContainText('Add alt text first');
  await first.getByLabel('Alt text').fill('Black embroidered suit, front view');
  await first.getByRole('button', { name: 'Save photo' }).click();
  await expect(page.getByText('Main', { exact: true })).toBeVisible();

  await uploadPhoto(page, 'back.jpg', 'Black embroidered suit, back view');
  await expect(page.getByRole('button', { name: 'Move Photo 2 up' })).toBeVisible();
  await expect.poll(async () => (await savedRows(db)).length).toBe(2);
  const [front, back] = await savedRows(db);
  expect(front).toMatchObject({ isPrimary: true, bytes: 4096 });

  // The second photo to the front: it becomes the main image.
  await page.getByRole('button', { name: 'Move Photo 2 up' }).click();
  await expect
    .poll(async () => (await savedRows(db)).map((r) => [r.id, r.isPrimary]))
    .toEqual([
      [back!.id, true],
      [front!.id, false],
    ]);

  const firstCard = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Drag to reorder Photo 1' }) });
  await expect(firstCard).toContainText('Main');
  await expect(firstCard.getByLabel('Alt text')).toHaveValue('Black embroidered suit, back view');

  // "Make main" moves the other one back.
  await page.getByRole('button', { name: 'Make main' }).click();
  await expect.poll(async () => (await savedRows(db))[0]?.id).toBe(front!.id);
  await expect(firstCard.getByLabel('Alt text')).toHaveValue('Black embroidered suit, front view');

  // Delete asks first.
  await page.getByRole('button', { name: 'Delete' }).nth(1).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this photo?' });
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect.poll(async () => (await savedRows(db)).length).toBe(1);
});

test('a wrong type or an oversize photo is refused before upload', async ({ page, users }) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);
  const input = page.getByLabel(/add photos or videos/i);
  await input.setInputFiles({ name: 'logo.gif', mimeType: 'image/gif', buffer: Buffer.alloc(10) });
  await expect(page.getByText(/logo\.gif can't be used/)).toBeVisible();
  await input.setInputFiles(photo('huge.jpg', 10 * 1024 * 1024 + 1));
  await expect(page.getByText(/huge\.jpg is 10\.0 MB/)).toBeVisible();
});

const video = (name: string) => ({ name, mimeType: 'video/mp4', buffer: Buffer.alloc(8192, 1) });

test('upload a video, give it a poster photo, then go back to the first frame', async ({
  page,
  users,
  db,
}) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);

  // The mock route reads a video's length from its name: 20 s here.
  await page.getByLabel(/add photos or videos/i).setInputFiles(video('walk-20s.mp4'));
  const card = page.getByRole('list', { name: 'New uploads' }).getByRole('listitem');
  await card.getByLabel('Alt text').fill('Model walking in a black embroidered suit');
  await card.getByRole('button', { name: 'Save video' }).click();
  await expect(page.getByText('Video 20s')).toBeVisible();
  await expect.poll(async () => (await savedRows(db))[0]?.durationSeconds).toBe('20');

  await expect(page.getByText('Poster: the first frame of the video.')).toBeVisible();
  await page.getByLabel('Change poster').setInputFiles(photo('poster.jpg'));
  // Sign, upload, read back and save: allow for a busy run.
  await expect(page.getByText('Poster: your photo.')).toBeVisible({ timeout: 15_000 });
  const [row] = await savedRows(db);
  expect(row?.posterPublicId).toMatch(new RegExp(`^products/${suit.id}/poster-`));

  await page.getByRole('button', { name: 'Use first frame' }).click();
  await expect(page.getByText('Poster: the first frame of the video.')).toBeVisible({
    timeout: 15_000,
  });
  await expect.poll(async () => (await savedRows(db))[0]?.posterPublicId).toBeNull();
});

test('a video over 60 seconds is refused when saved, with the reason', async ({
  page,
  users,
  db,
}) => {
  await loginAsAdmin(page, users);
  await page.goto(`/suits/${suit.id}`);
  await page.getByLabel(/add photos or videos/i).setInputFiles(video('long-61s.mp4'));
  const card = page.getByRole('list', { name: 'New uploads' }).getByRole('listitem');
  await card.getByLabel('Alt text').fill('Model walking in a black embroidered suit');
  await card.getByRole('button', { name: 'Save video' }).click();
  await expect(card.getByRole('alert')).toContainText('longer than 60 seconds');
  await expect(card.getByRole('button', { name: 'Remove' })).toBeVisible();
  expect(await savedRows(db)).toHaveLength(0);
});
