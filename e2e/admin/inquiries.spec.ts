import { randomUUID } from 'node:crypto';

import { inquiry } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });
test.describe.configure({ timeout: 60_000 });

let inquiryId: string;
let name: string;

test.beforeEach(async ({ db }) => {
  name = `E2E Ayesha ${randomUUID().slice(0, 6)}`;
  const [row] = await db
    .insert(inquiry)
    .values({
      name,
      phone: '+923001234567',
      email: 'ayesha.e2e@example.com',
      message: 'Is the black suit available?\nI am in Lahore.',
    })
    .returning();
  inquiryId = row!.id;
});

test.afterEach(async ({ db }) => {
  await db.delete(inquiry).where(eq(inquiry.id, inquiryId));
});

test('reply links on a new inquiry, then mark it contacted and it moves tabs', async ({
  page,
  users,
  db,
}) => {
  await loginAsAdmin(page, users);
  await page.goto('/inquiries');
  await expect(page.getByRole('link', { name: /^New \(\d+\)$/ })).toHaveAttribute(
    'aria-current',
    'page',
  );

  const card = page.getByRole('listitem').filter({ hasText: name });
  await expect(card.getByText('I am in Lahore.')).toBeVisible();
  const whatsapp = await card.getByRole('link', { name: 'WhatsApp' }).getAttribute('href');
  expect(whatsapp?.startsWith('https://wa.me/923001234567?text=Hi%20E2E%20Ayesha')).toBe(true);
  await expect(card.getByRole('link', { name: 'Call' })).toHaveAttribute(
    'href',
    'tel:+923001234567',
  );
  await expect(card.getByRole('link', { name: 'Email' })).toHaveAttribute(
    'href',
    /^mailto:ayesha\.e2e@example\.com\?subject=Your%20inquiry/,
  );

  await card.getByRole('button', { name: `Mark contacted: ${name}` }).click();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(0);
  await expect
    .poll(async () => (await db.select().from(inquiry).where(eq(inquiry.id, inquiryId)))[0]?.status)
    .toBe('contacted');

  await page.getByRole('link', { name: /^Contacted \(\d+\)$/ }).click();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible();
});
