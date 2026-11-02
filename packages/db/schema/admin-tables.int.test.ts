import { eq, sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../testing';
import { auditLog } from './audit-log';
import { siteSetting } from './site-setting';
import { slugRedirect } from './slug-redirect';
import { user } from './user';

let db: TestDb;
let n = 0;

beforeAll(async () => {
  db = await createTestDb();
});

const makeUser = async (overrides: Partial<typeof user.$inferInsert> = {}) => {
  n += 1;
  const [row] = await db
    .insert(user)
    .values({ name: `Person ${n}`, email: `person${n}@example.com`, ...overrides })
    .returning();
  return row!;
};

describe('user table', () => {
  it('creates a customer by default, unverified and not banned', async () => {
    expect(await makeUser()).toMatchObject({
      role: 'customer',
      emailVerified: false,
      banned: false,
      phone: null,
      image: null,
    });
  });

  it('rejects an email that is not lower case', async () => {
    await expect(makeUser({ email: 'Ayesha@Example.com' })).rejects.toThrow();
  });

  it('rejects a second account with the same email', async () => {
    await makeUser({ email: 'same@example.com' });
    await expect(makeUser({ email: 'same@example.com' })).rejects.toThrow();
  });

  it('allows only the customer and admin roles', async () => {
    expect((await makeUser({ role: 'admin' })).role).toBe('admin');
    await expect(makeUser({ role: 'owner' })).rejects.toThrow();
  });
});

describe('slug_redirect table', () => {
  it('keeps one redirect per old slug for each kind of page', async () => {
    await db.insert(slugRedirect).values({ entity: 'product', oldSlug: 'old', targetId: 'p1' });
    await expect(
      db.insert(slugRedirect).values({ entity: 'product', oldSlug: 'old', targetId: 'p2' }),
    ).rejects.toThrow();
    const [row] = await db
      .insert(slugRedirect)
      .values({ entity: 'category', oldSlug: 'old', targetId: 'c1' })
      .returning();
    expect(row!.createdAt).toBeInstanceOf(Date);
  });
});

describe('site_setting table', () => {
  it('stores any JSON value under a key, and forgets the editor if their account goes', async () => {
    const admin = await makeUser({ role: 'admin' });
    await db.insert(siteSetting).values({
      key: 'socials',
      value: { instagram: 'https://instagram.com/x' },
      updatedBy: admin.id,
    });
    await db.delete(user).where(eq(user.id, admin.id));
    const [row] = await db.select().from(siteSetting).where(eq(siteSetting.key, 'socials'));
    expect(row).toMatchObject({ value: { instagram: 'https://instagram.com/x' }, updatedBy: null });
  });

  it('rejects a second row for the same key', async () => {
    await db.insert(siteSetting).values({ key: 'phone', value: '+923069558717' });
    await expect(
      db.insert(siteSetting).values({ key: 'phone', value: '+923000000000' }),
    ).rejects.toThrow();
  });
});

describe('audit_log table', () => {
  // Drizzle wraps the database error; the trigger's message is on its cause.
  const insertOnly = { cause: { message: expect.stringMatching(/audit_log is insert-only/) } };

  const record = async (actorId: string | null) => {
    const [row] = await db
      .insert(auditLog)
      .values({
        actorId,
        action: 'product.update',
        entity: 'product',
        entityId: 'p1',
        changes: { before: { price: 4000 }, after: { price: 4500 } },
      })
      .returning();
    return row!;
  };

  it('records an action with its changes', async () => {
    const admin = await makeUser({ role: 'admin' });
    expect(await record(admin.id)).toMatchObject({
      actorId: admin.id,
      changes: { before: { price: 4000 }, after: { price: 4500 } },
    });
  });

  it('refuses to change or delete a row', async () => {
    const row = await record(null);
    await expect(
      db.update(auditLog).set({ action: 'product.delete' }).where(eq(auditLog.id, row.id)),
    ).rejects.toMatchObject(insertOnly);
    await expect(db.delete(auditLog).where(eq(auditLog.id, row.id))).rejects.toMatchObject(
      insertOnly,
    );
  });

  it('keeps the rows when the actor’s account is deleted, with no actor', async () => {
    const admin = await makeUser({ role: 'admin' });
    const row = await record(admin.id);
    await db.delete(user).where(eq(user.id, admin.id));
    const [after] = await db.select().from(auditLog).where(eq(auditLog.id, row.id));
    expect(after).toMatchObject({ actorId: null, action: 'product.update' });
  });

  it('refuses to clear the actor by hand when anything else changes too', async () => {
    const admin = await makeUser({ role: 'admin' });
    const row = await record(admin.id);
    await expect(
      db.execute(sql`update audit_log set actor_id = null, entity_id = 'p2' where id = ${row.id}`),
    ).rejects.toMatchObject(insertOnly);
  });
});
