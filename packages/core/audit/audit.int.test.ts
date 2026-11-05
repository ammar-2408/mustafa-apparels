import { user } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { makeUser } from '../test/factories';
import * as audit from './index';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

const write = (actorId: string, action: string, entity: string, entityId: string) =>
  audit.record(db, { actorId }, { action, entity, entityId, changes: {} });

describe('audit.diff', () => {
  it('keeps only changed fields and never the generated or bookkeeping ones', () => {
    expect(
      audit.diff(
        { price: 4000, name: 'A', updatedAt: 1, searchVector: 'x' },
        { price: 4500, name: 'A', updatedAt: 2, searchVector: 'y' },
      ),
    ).toEqual({ before: { price: 4000 }, after: { price: 4500 } });
  });
});

describe('audit.list', () => {
  it('lists newest first with the actor’s name', async () => {
    const owner = await makeUser(db, { role: 'admin', name: 'Owner' });
    await write(owner.id, 'product.create', 'product', 'p1');
    await write(owner.id, 'product.update', 'product', 'p1');
    const { items, total } = await audit.list(db, {});
    expect(total).toBe(2);
    expect(items.map((i) => i.action)).toEqual(['product.update', 'product.create']);
    expect(items[0]).toMatchObject({ actor: { id: owner.id, name: 'Owner' }, entityId: 'p1' });
  });

  it('filters by entity, by one record and by actor', async () => {
    const a = await makeUser(db, { role: 'admin' });
    const b = await makeUser(db, { role: 'admin' });
    await write(a.id, 'product.update', 'product', 'p1');
    await write(a.id, 'product.update', 'product', 'p2');
    await write(b.id, 'category.update', 'category', 'c1');
    expect((await audit.list(db, { entity: 'product' })).total).toBe(2);
    expect((await audit.list(db, { entity: 'product', entityId: 'p2' })).total).toBe(1);
    expect((await audit.list(db, { actorId: b.id })).items.map((i) => i.entityId)).toEqual(['c1']);
  });

  it('pages 50 at a time', async () => {
    const owner = await makeUser(db, { role: 'admin' });
    for (let i = 0; i < 51; i += 1) await write(owner.id, 'product.update', 'product', `p${i}`);
    const first = await audit.list(db, {});
    expect([first.items.length, first.pageCount]).toEqual([50, 2]);
    expect((await audit.list(db, { page: 2 })).items).toHaveLength(1);
  });

  it('shows rows whose actor account was deleted, with no actor', async () => {
    const gone = await makeUser(db, { role: 'admin' });
    await write(gone.id, 'product.update', 'product', 'p1');
    await db.delete(user).where(eq(user.id, gone.id));
    expect((await audit.list(db, {})).items[0]!.actor).toBeNull();
  });

  it('can hide rows from removed accounts, and counts only what it shows', async () => {
    const gone = await makeUser(db, { role: 'admin' });
    const owner = await makeUser(db, { role: 'admin' });
    await write(gone.id, 'product.update', 'product', 'p1');
    await write(owner.id, 'product.update', 'product', 'p2');
    await db.delete(user).where(eq(user.id, gone.id));
    const shown = await audit.list(db, { hideRemoved: true });
    expect(shown.items.map((i) => i.entityId)).toEqual(['p2']);
    expect(shown.total).toBe(1);
    expect((await audit.list(db, {})).total).toBe(2);
  });
});

describe('audit.actors', () => {
  it('lists each person who appears in the log once, by name', async () => {
    const zara = await makeUser(db, { name: 'Zara', role: 'admin' });
    const amna = await makeUser(db, { name: 'Amna', role: 'admin' });
    await makeUser(db, { name: 'Nobody', role: 'admin' });
    await write(zara.id, 'product.update', 'product', 'p1');
    await write(zara.id, 'product.update', 'product', 'p2');
    await write(amna.id, 'setting.update', 'setting', 'whatsapp');
    expect(await audit.actors(db)).toEqual([
      { id: amna.id, name: 'Amna' },
      { id: zara.id, name: 'Zara' },
    ]);
  });
});
