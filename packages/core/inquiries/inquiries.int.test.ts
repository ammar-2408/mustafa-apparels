import { auditLog, inquiry, product } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { inquiryListInput } from '@mustafa/validators/inquiry';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeProduct, makeUser } from '../test/factories';
import * as inquiries from './index';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

let minute = 0;
const add = async (extra: Partial<typeof inquiry.$inferInsert> = {}) => {
  minute += 1;
  const [row] = await db
    .insert(inquiry)
    .values({
      name: 'Ayesha',
      phone: '+923001234567',
      message: 'Is this available?',
      createdAt: new Date(Date.UTC(2026, 10, 1, 10, minute)),
      ...extra,
    })
    .returning();
  return row!;
};

const list = (input: Record<string, string> = {}) =>
  inquiries.list(db, inquiryListInput.parse(input));

describe('inquiries', () => {
  it('lists one tab newest first, with the suit asked about', async () => {
    const suit = await makeProduct(db, { name: 'Black Suit', designCode: 'DHN-01' });
    const older = await add({ productId: suit.id });
    const newer = await add({ name: 'Sana', email: 'sana@example.com', phone: null });
    await add({ status: 'closed' });
    const result = await list();
    expect(result.items.map((i) => i.id)).toEqual([newer.id, older.id]);
    expect(result.items[1]).toMatchObject({ productName: 'Black Suit', productCode: 'DHN-01' });
    expect(result.items[0]).toMatchObject({ productName: null, email: 'sana@example.com' });
    expect((await list({ status: 'closed' })).total).toBe(1);
  });

  it('keeps an inquiry whose suit was deleted', async () => {
    const suit = await makeProduct(db);
    await add({ productId: suit.id });
    await db.delete(product).where(eq(product.id, suit.id));
    expect((await list()).items[0]).toMatchObject({ productId: null, productName: null });
  });

  it('counts each tab', async () => {
    await add();
    await add();
    await add({ status: 'contacted' });
    expect(await inquiries.counts(db)).toEqual({ new: 2, contacted: 1, closed: 0 });
  });

  it('moves an inquiry along with an audit row that holds no contact details', async () => {
    const actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
    const row = await add();
    await inquiries.setStatus(db, { id: row.id, status: 'contacted' }, actor);
    await inquiries.setStatus(db, { id: row.id, status: 'contacted' }, actor);
    expect((await list({ status: 'contacted' })).total).toBe(1);
    const audits = await db.select().from(auditLog);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: 'inquiry.status',
      entity: 'inquiry',
      entityId: row.id,
    });
    expect(JSON.stringify(audits[0]!.changes)).not.toMatch(/923001234567|available/);
  });

  it('answers NOT_FOUND for an inquiry that does not exist', async () => {
    const actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
    await expect(
      inquiries.setStatus(db, { id: 'missing', status: 'closed' }, actor),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('pages 50 at a time', async () => {
    for (let i = 0; i < inquiries.INQUIRY_PAGE_SIZE + 1; i++) await add();
    expect(await list()).toMatchObject({ total: 51, pageCount: 2 });
    expect((await list({ page: '2' })).items).toHaveLength(1);
  });
});
