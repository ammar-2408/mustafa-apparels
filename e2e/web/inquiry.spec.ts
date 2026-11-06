import { inquiry, product } from '@mustafa/db/schema';
import { eq } from 'drizzle-orm';

import { emailWith } from '../support/outbox';
import { expect, test } from '../support/users';

// The question form on a suit page (docs/prd.md W5).
test('a shopper sends a question; it is saved, the shop is emailed, and they are thanked', async ({
  page,
  db,
}) => {
  const [suit] = await db
    .select({ id: product.id, slug: product.slug })
    .from(product)
    .where(eq(product.designCode, 'E2E-01'));
  const message = `Is this suit in stock? ${Date.now()}`;
  await page.goto(`/products/${suit!.slug}`);
  const form = page.getByRole('form', { name: /^Ask about/ });

  // Nothing filled: the errors show, nothing is sent.
  await form.getByRole('button', { name: 'Send question' }).click();
  await expect(form.getByText('Enter your name')).toBeVisible();
  await expect(form.getByText('Add a phone number or an email')).toBeVisible();

  await form.getByRole('textbox', { name: 'Name' }).fill('Ayesha');
  await form.getByRole('textbox', { name: 'Phone or WhatsApp' }).fill('0300 1234567');
  await form.getByRole('textbox', { name: 'Your question' }).fill(message);
  // A person takes longer than the 2-second bot check.
  await page.waitForTimeout(2100);
  await form.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Thank you' })).toBeVisible();

  try {
    const [saved] = await db.select().from(inquiry).where(eq(inquiry.message, message));
    expect(saved).toMatchObject({ productId: suit!.id, phone: '+923001234567', status: 'new' });
    const email = await emailWith('new-inquiry', message);
    expect(email.subject).toMatch(/^New question about .+ \(E2E-01\)$/);
  } finally {
    await db.delete(inquiry).where(eq(inquiry.message, message));
  }
});
