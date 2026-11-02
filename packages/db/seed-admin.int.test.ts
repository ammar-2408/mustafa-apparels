import { verifyPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { account, user } from './schema';
import { adminFromEnv, seed } from './seed';
import { createTestDb, resetTestDb, type TestDb } from './testing';

const PASSWORD = 'a long owner passphrase 2026';
const ADMIN = { email: 'owner@example.com', password: PASSWORD };

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(() => resetTestDb(db));

describe('seed: first admin', () => {
  it('creates a verified admin whose password only exists as a working scrypt hash', async () => {
    const summary = await seed(db, { appEnv: 'development', admin: ADMIN });
    expect(summary.admins).toBe(1);

    const [owner] = await db.select().from(user);
    expect(owner).toMatchObject({ email: 'owner@example.com', role: 'admin', emailVerified: true });
    expect(owner?.twoFactorEnabled).toBe(false);

    const [credential] = await db.select().from(account);
    expect(credential).toMatchObject({
      userId: owner!.id,
      accountId: owner!.id,
      providerId: 'credential',
    });
    expect(credential?.password).not.toContain(PASSWORD);
    expect(await verifyPassword({ hash: credential!.password!, password: PASSWORD })).toBe(true);
  });

  it('stores the email trimmed and in lower case', async () => {
    await seed(db, { appEnv: 'development', admin: { ...ADMIN, email: ' Owner@Example.COM ' } });
    expect((await db.select().from(user))[0]?.email).toBe('owner@example.com');
  });

  it('changes nothing on a second run, and never resets the password', async () => {
    await seed(db, { appEnv: 'development', admin: ADMIN });
    const before = {
      users: await db.select().from(user),
      accounts: await db.select().from(account),
    };

    const summary = await seed(db, {
      appEnv: 'development',
      admin: { ...ADMIN, password: 'a different passphrase entirely' },
    });

    expect(summary.admins).toBe(0);
    expect(await db.select().from(user)).toEqual(before.users);
    expect(await db.select().from(account)).toEqual(before.accounts);
  });

  it('refuses to promote an existing customer with that email', async () => {
    await db.insert(user).values({ name: 'Customer', email: 'owner@example.com' });
    await expect(seed(db, { appEnv: 'development', admin: ADMIN })).rejects.toThrow(
      /already belongs to a customer/,
    );
    const [row] = await db.select().from(user).where(eq(user.email, 'owner@example.com'));
    expect(row?.role).toBe('customer');
    expect(await db.select().from(account)).toHaveLength(0);
  });
});

describe('adminFromEnv', () => {
  it('returns the admin from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD', () => {
    expect(
      adminFromEnv({ SEED_ADMIN_EMAIL: 'owner@example.com', SEED_ADMIN_PASSWORD: PASSWORD }),
    ).toEqual(ADMIN);
  });

  it('names every missing or blank variable', () => {
    expect(() => adminFromEnv({})).toThrow(/SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD/);
    expect(() =>
      adminFromEnv({ SEED_ADMIN_EMAIL: 'owner@example.com', SEED_ADMIN_PASSWORD: '  ' }),
    ).toThrow(/SEED_ADMIN_PASSWORD is missing/);
  });

  it('refuses a password outside the policy without printing it', () => {
    for (const password of ['short-pw1', 'x'.repeat(129)]) {
      const run = () =>
        adminFromEnv({ SEED_ADMIN_EMAIL: 'owner@example.com', SEED_ADMIN_PASSWORD: password });
      expect(run).toThrow(/SEED_ADMIN_PASSWORD must be 10 to 128 characters/);
      try {
        run();
      } catch (error) {
        expect(String(error)).not.toContain(password);
      }
    }
  });

  it('refuses something that is not an email', () => {
    expect(() =>
      adminFromEnv({ SEED_ADMIN_EMAIL: 'owner', SEED_ADMIN_PASSWORD: PASSWORD }),
    ).toThrow(/SEED_ADMIN_EMAIL must be an email address/);
  });
});
