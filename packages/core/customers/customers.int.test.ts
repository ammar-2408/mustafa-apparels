import { inquiry } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { customerListInput } from '@mustafa/validators/search';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeUser } from '../test/factories';
import * as customers from './index';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

const list = (input: Record<string, string> = {}) =>
  customers.list(db, customerListInput.parse(input));

describe('customers.list', () => {
  it('lists customers only, never admins, with their inquiry count', async () => {
    const ayesha = await makeUser(db, { name: 'Ayesha Khan', email: 'ayesha@example.com' });
    await makeUser(db, { name: 'Owner', email: 'owner@example.com', role: 'admin' });
    await db.insert(inquiry).values([
      { name: 'Ayesha', phone: '+923001234567', message: 'One', userId: ayesha.id },
      { name: 'Ayesha', phone: '+923001234567', message: 'Two', userId: ayesha.id },
    ]);
    const result = await list();
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ name: 'Ayesha Khan', inquiries: 2 });
  });

  it('searches by name or email, case-insensitively, with % and _ taken literally', async () => {
    await makeUser(db, { name: 'Ayesha Khan', email: 'ayesha@example.com' });
    await makeUser(db, { name: 'Sana Malik', email: 'sana_m@example.com' });
    expect((await list({ q: 'KHAN' })).items.map((c) => c.name)).toEqual(['Ayesha Khan']);
    expect((await list({ q: 'sana_m' })).items.map((c) => c.name)).toEqual(['Sana Malik']);
    expect((await list({ q: '%' })).total).toBe(0);
    expect((await list({ q: 'a_e' })).total).toBe(0);
  });

  it('pages 50 at a time', async () => {
    for (let i = 0; i < customers.CUSTOMER_PAGE_SIZE + 1; i++) await makeUser(db);
    expect(await list()).toMatchObject({ total: 51, pageCount: 2 });
  });
});
