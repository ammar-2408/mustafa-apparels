import { inquiry, session, user, wishlistItem } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CoreError } from '../errors';
import { makeCategory, makeProduct, makeUser } from '../test/factories';
import * as account from './index';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await resetTestDb(db);
});

describe('saved suits', () => {
  it('saves a public suit once, lists it, and removes it', async () => {
    const me = await makeUser(db);
    const suit = await makeProduct(db, { published: true });
    expect(await account.setSaved(db, me.id, { productId: suit.id, saved: true })).toEqual({
      saved: true,
    });
    await account.setSaved(db, me.id, { productId: suit.id, saved: true }); // twice is harmless
    expect((await account.savedSuits(db, me.id)).map((s) => s.id)).toEqual([suit.id]);
    await account.setSaved(db, me.id, { productId: suit.id, saved: false });
    expect(await account.savedSuits(db, me.id)).toEqual([]);
  });

  it('refuses to save a draft, and hides a saved suit once it is unpublished or hidden', async () => {
    const me = await makeUser(db);
    const draft = await makeProduct(db);
    await expect(
      account.setSaved(db, me.id, { productId: draft.id, saved: true }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const hidden = await makeCategory(db, { isActive: false });
    const later = await makeProduct(db, { published: true, categoryId: hidden.id });
    await db.insert(wishlistItem).values({ userId: me.id, productId: later.id });
    expect(await account.savedSuits(db, me.id)).toEqual([]);
  });

  it('never shows or changes another customer’s list (IDOR)', async () => {
    const me = await makeUser(db);
    const other = await makeUser(db);
    const suit = await makeProduct(db, { published: true });
    await account.setSaved(db, other.id, { productId: suit.id, saved: true });
    expect(await account.savedSuits(db, me.id)).toEqual([]);
    await account.setSaved(db, me.id, { productId: suit.id, saved: false });
    expect(await account.savedSuits(db, other.id)).toHaveLength(1);
  });
});

describe('my questions', () => {
  it('lists only my own, newest first, with the suit while it is published (IDOR)', async () => {
    const me = await makeUser(db);
    const other = await makeUser(db);
    const suit = await makeProduct(db, { published: true });
    const at = (minute: number) => new Date(Date.UTC(2026, 10, 6, 10, minute));
    await db.insert(inquiry).values([
      { userId: me.id, name: 'Me', phone: '+923001234567', message: 'First', createdAt: at(1) },
      {
        userId: me.id,
        productId: suit.id,
        name: 'Me',
        phone: '+923001234567',
        message: 'Second',
        createdAt: at(2),
      },
      { userId: other.id, name: 'Other', phone: '+923001234568', message: 'Not mine' },
    ]);
    const mine = await account.myInquiries(db, me.id);
    expect(mine.map((i) => [i.message, i.suitName])).toEqual([
      ['Second', suit.name],
      ['First', null],
    ]);
  });
});

describe('profile and delete', () => {
  it('changes my name and phone only', async () => {
    const me = await makeUser(db);
    const other = await makeUser(db, { name: 'Other' });
    expect(
      await account.updateProfile(db, me.id, { name: 'Ayesha K', phone: '+923001234567' }),
    ).toMatchObject({
      name: 'Ayesha K',
      phone: '+923001234567',
    });
    const [untouched] = await db.select().from(user).where(eq(user.id, other.id));
    expect(untouched!.name).toBe('Other');
    await expect(
      account.updateProfile(db, 'nobody', { name: 'X Y', phone: null }),
    ).rejects.toBeInstanceOf(CoreError);
  });

  it('deletes the account and its sessions and saved suits, keeping its questions without contact details', async () => {
    const me = await makeUser(db);
    const suit = await makeProduct(db, { published: true });
    await account.setSaved(db, me.id, { productId: suit.id, saved: true });
    await db.insert(session).values({
      id: 's1',
      token: 'token-1',
      userId: me.id,
      expiresAt: new Date(Date.now() + 3_600_000),
      app: 'web',
    });
    const [question] = await db
      .insert(inquiry)
      .values({
        userId: me.id,
        name: 'Ayesha',
        email: 'a@example.com',
        phone: '+923001234567',
        message: 'Is it in stock?',
        ipHash: 'abc',
      })
      .returning();

    await account.deleteAccount(db, me.id);

    expect(await db.select().from(user).where(eq(user.id, me.id))).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, me.id))).toEqual([]);
    expect(await db.select().from(wishlistItem)).toEqual([]);
    const [kept] = await db.select().from(inquiry).where(eq(inquiry.id, question!.id));
    expect(kept).toMatchObject({
      userId: null,
      name: 'Deleted account',
      email: null,
      phone: null,
      ipHash: null,
      message: 'Is it in stock?',
    });
    await expect(account.deleteAccount(db, me.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
