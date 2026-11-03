import { account, session, twoFactor, user } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { adminAccess, type AdminSessionData } from './guards';
import { createAuth } from './index';
import { sendEmail } from './test/outbox';
import { secretFrom, totp } from './test/totp';

type Enabled = { totpURI: string; backupCodes: string[] };

const SECRET = 'test-secret-for-integration-tests-only-0123456789';
const PASSWORD = 'correct horse battery staple';
const BASE = 'http://localhost:3001';
const EMAIL = 'owner@example.com';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(() => resetTestDb(db));
afterAll(() => db.$client.close());

const auth = () => createAuth({ app: 'admin', db, baseURL: BASE, secret: SECRET, sendEmail });

// A tiny cookie jar, so each test acts like one browser.
function browser() {
  const jar = new Map<string, string>();
  const call = async (path: string, body?: unknown) => {
    const response = await auth().handler(
      new Request(`${BASE}/api/auth${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'content-type': 'application/json',
          origin: BASE,
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, ...value] = pair!.split('=');
      if (value.join('=') === '') jar.delete(name!);
      else jar.set(name!, value.join('='));
    }
    return response;
  };
  const current = async () =>
    (await (await call('/get-session')).json()) as AdminSessionData | null;
  return { call, current };
}

const seedAdmin = async () => {
  const [row] = await db
    .insert(user)
    .values({ name: 'Owner', email: EMAIL, role: 'admin', emailVerified: true })
    .returning();
  await db.insert(account).values({
    userId: row!.id,
    accountId: row!.id,
    providerId: 'credential',
    password: await hashPassword(PASSWORD),
  });
};

// First login, then setup: the path the owner takes once.
async function enrol() {
  await seedAdmin();
  const b = browser();
  await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
  const enabled = (await (
    await b.call('/two-factor/enable', { password: PASSWORD })
  ).json()) as Enabled;
  const secret = secretFrom(enabled.totpURI);
  expect((await b.call('/two-factor/verify-totp', { code: totp(secret) })).status).toBe(200);
  await b.call('/sign-out', {});
  return { secret, backupCodes: enabled.backupCodes as string[] };
}

describe('first login', () => {
  it('lets the admin in only as far as 2FA setup', async () => {
    await seedAdmin();
    const b = browser();
    expect((await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD })).status).toBe(200);
    expect(adminAccess(await b.current())).toBe('needs-2fa');
  });

  it('turns 2FA on only after a correct code from the app', async () => {
    await seedAdmin();
    const b = browser();
    await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    const enabled = (await (
      await b.call('/two-factor/enable', { password: PASSWORD })
    ).json()) as Enabled;
    expect(enabled.totpURI).toMatch(/^otpauth:\/\/totp\/Mustafa%20Apparels%20Admin/);
    expect(enabled.backupCodes).toHaveLength(10);

    expect((await b.call('/two-factor/verify-totp', { code: '000000' })).status).toBe(401);
    expect(adminAccess(await b.current())).toBe('needs-2fa');

    const code = totp(secretFrom(enabled.totpURI));
    expect((await b.call('/two-factor/verify-totp', { code })).status).toBe(200);
    expect(adminAccess(await b.current())).toBe('ok');
  });

  it('stores the secret and backup codes encrypted, never as given', async () => {
    const { secret, backupCodes } = await enrol();
    const [row] = await db.select().from(twoFactor);
    expect(row?.secret).not.toContain(secret);
    for (const code of backupCodes) expect(row?.backupCodes).not.toContain(code);
  });
});

describe('every later login', () => {
  it('asks for a code before any session exists, and refuses a wrong one', async () => {
    const { secret } = await enrol();
    const b = browser();
    const signIn = await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    expect(await signIn.json()).toMatchObject({ twoFactorRedirect: true });
    expect(await db.select().from(session)).toHaveLength(0);
    expect(await b.current()).toBeNull();

    expect((await b.call('/two-factor/verify-totp', { code: '123456' })).status).toBe(401);
    expect((await b.call('/two-factor/verify-totp', { code: totp(secret) })).status).toBe(200);
    expect(adminAccess(await b.current())).toBe('ok');
  });

  it('accepts each backup code once', async () => {
    const { backupCodes } = await enrol();
    const first = browser();
    await first.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    expect(
      (await first.call('/two-factor/verify-backup-code', { code: backupCodes[0] })).status,
    ).toBe(200);

    const second = browser();
    await second.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    expect(
      (await second.call('/two-factor/verify-backup-code', { code: backupCodes[0] })).status,
    ).toBe(401);
  });

  it('never trusts a browser', async () => {
    const { secret } = await enrol();
    const b = browser();
    await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    const response = await b.call('/two-factor/verify-totp', {
      code: totp(secret),
      trustDevice: true,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'TRUST_DEVICE_OFF' });
  });

  it('ends a login after 5 wrong codes, even before the right one', async () => {
    const { secret } = await enrol();
    const b = browser();
    await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    for (let i = 0; i < 5; i++) await b.call('/two-factor/verify-totp', { code: '000000' });
    expect((await b.call('/two-factor/verify-totp', { code: totp(secret) })).status).not.toBe(200);
  });

  it('locks 2FA for 15 minutes after 10 wrong codes across logins', async () => {
    const { secret } = await enrol();
    for (let login = 0; login < 2; login++) {
      const b = browser();
      await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
      for (let i = 0; i < 5; i++) await b.call('/two-factor/verify-totp', { code: '000000' });
    }
    const [row] = await db.select().from(twoFactor);
    expect(row?.lockedUntil?.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);

    const b = browser();
    await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    const locked = await b.call('/two-factor/verify-totp', { code: totp(secret) });
    expect(locked.status).toBe(429);
    expect(await b.current()).toBeNull();
  });
});

it('keeps an admin without 2FA out of everything but setup', async () => {
  await seedAdmin();
  await db.update(user).set({ twoFactorEnabled: false }).where(eq(user.email, EMAIL));
  const b = browser();
  await b.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
  expect(adminAccess(await b.current())).toBe('needs-2fa');
});

describe('turning 2FA on', () => {
  it('ends every password-only session but the one that turned it on', async () => {
    await seedAdmin();
    // Someone else with the password signs in before setup, and again during it.
    const early = browser();
    await early.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    const owner = browser();
    await owner.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    const enabled = (await (
      await owner.call('/two-factor/enable', { password: PASSWORD })
    ).json()) as Enabled;
    const during = browser();
    await during.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    expect(adminAccess(await early.current())).toBe('needs-2fa');

    const code = totp(secretFrom(enabled.totpURI));
    expect((await owner.call('/two-factor/verify-totp', { code })).status).toBe(200);

    expect(adminAccess(await owner.current())).toBe('ok');
    expect(await early.current()).toBeNull();
    expect(await during.current()).toBeNull();
    expect(await db.select().from(session)).toHaveLength(1);
  });

  it('leaves other 2FA sessions alone on a normal login', async () => {
    const { secret } = await enrol();
    const laptop = browser();
    await laptop.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    await laptop.call('/two-factor/verify-totp', { code: totp(secret) });
    const phone = browser();
    await phone.call('/sign-in/email', { email: EMAIL, password: PASSWORD });
    await phone.call('/two-factor/verify-totp', { code: totp(secret) });
    expect(adminAccess(await laptop.current())).toBe('ok');
    expect(adminAccess(await phone.current())).toBe('ok');
  });
});
