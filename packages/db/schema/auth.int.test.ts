import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../testing';
import { account, session, twoFactor } from './auth';
import { user } from './user';

let db: TestDb;
let n = 0;

beforeAll(async () => {
  db = await createTestDb();
});

const makeUser = async () => {
  n += 1;
  const [row] = await db
    .insert(user)
    .values({ name: `Person ${n}`, email: `person${n}@example.com` })
    .returning();
  return row!;
};

const sessionFor = (userId: string, app: string) => ({
  userId,
  app,
  token: `token-${(n += 1)}`,
  expiresAt: new Date(Date.now() + 60_000),
});

describe('auth tables', () => {
  it('starts every user without 2FA', async () => {
    expect((await makeUser()).twoFactorEnabled).toBe(false);
  });

  it('accepts web and admin sessions and refuses any other app', async () => {
    const { id } = await makeUser();
    await db.insert(session).values([sessionFor(id, 'web'), sessionFor(id, 'admin')]);
    await expect(db.insert(session).values(sessionFor(id, 'shop'))).rejects.toThrow();
  });

  it('refuses two sessions with the same token', async () => {
    const { id } = await makeUser();
    const first = sessionFor(id, 'web');
    await db.insert(session).values(first);
    await expect(db.insert(session).values({ ...first })).rejects.toThrow();
  });

  it("deletes a user's sessions, accounts and 2FA with the user", async () => {
    const { id } = await makeUser();
    await db.insert(session).values(sessionFor(id, 'admin'));
    await db.insert(account).values({ userId: id, accountId: id, providerId: 'credential' });
    await db.insert(twoFactor).values({ userId: id, secret: 's', backupCodes: 'b' });

    await db.delete(user).where(eq(user.id, id));

    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    expect(await db.select().from(account).where(eq(account.userId, id))).toHaveLength(0);
    expect(await db.select().from(twoFactor).where(eq(twoFactor.userId, id))).toHaveLength(0);
  });
});
