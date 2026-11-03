import { session, user, verification } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createAuth } from './index';
import { linkFor, outbox, sendEmail } from './test/outbox';

const SECRET = 'test-secret-for-integration-tests-only-0123456789';
const BASE = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';
const NEW_PASSWORD = 'a brand new passphrase here';
const EMAIL = 'ayesha@example.com';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  outbox.length = 0;
  await resetTestDb(db);
});
afterAll(() => db.$client.close());

const auth = () => createAuth({ app: 'web', db, baseURL: BASE, secret: SECRET, sendEmail });

const post = (path: string, body: unknown) =>
  auth().handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify(body),
    }),
  );
const get = (url: string) => auth().handler(new Request(url));

const signUp = (email = EMAIL) =>
  post('/sign-up/email', { name: 'Ayesha', email, password: PASSWORD, callbackURL: '/account' });
const signIn = (password = PASSWORD) => post('/sign-in/email', { email: EMAIL, password });

describe('email verification', () => {
  it('sends a link on sign-up, and refuses login until it is used', async () => {
    expect((await signUp()).status).toBe(200);
    expect(outbox.map((e) => [e.kind, e.to])).toEqual([['verify-email', EMAIL]]);

    const early = await signIn();
    expect(early.status).toBe(403);
    expect(await early.json()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    // A login before confirming sends a fresh link.
    expect(outbox.filter((e) => e.kind === 'verify-email')).toHaveLength(2);
    expect(await db.select().from(session)).toHaveLength(0);
  });

  it('confirms the email, signs in and goes to the account page when the link is used', async () => {
    await signUp();
    const response = await get(linkFor(EMAIL));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/account');
    expect(response.headers.getSetCookie().join()).toMatch(/ma\.session_token=/);
    const [row] = await db.select().from(user);
    expect(row?.emailVerified).toBe(true);
    expect((await signIn()).status).toBe(200);
  });

  it('answers a sign-up for a registered email exactly like a new one, and emails the owner', async () => {
    const first = await signUp();
    await get(linkFor(EMAIL));
    outbox.length = 0;

    const second = await signUp();
    expect(second.status).toBe(first.status);
    const keys = async (response: Response) =>
      Object.keys((await response.json()) as object).sort();
    expect(await keys(second)).toEqual(await keys(first));
    expect(await db.select().from(user)).toHaveLength(1);
    expect(outbox.map((e) => e.kind)).toEqual(['existing-account']);
    expect(outbox[0]?.text).toContain(`${BASE}/forgot-password`);
  });
});

describe('password reset', () => {
  const verifiedUser = async () => {
    await signUp();
    await get(linkFor(EMAIL));
    outbox.length = 0;
  };
  const requestReset = (email = EMAIL) =>
    post('/request-password-reset', { email, redirectTo: '/reset-password' });

  // The emailed link checks the token, then redirects to our page with it.
  const tokenFromLink = async () => {
    const response = await get(linkFor(EMAIL));
    const location = new URL(response.headers.get('location')!, BASE);
    expect(location.pathname).toBe('/reset-password');
    return location.searchParams.get('token')!;
  };

  it('answers the same for an unknown email, and sends nothing', async () => {
    await verifiedUser();
    const known = await requestReset();
    const unknown = await requestReset('nobody@example.com');
    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(await known.json());
    expect(outbox.map((e) => e.to)).toEqual([EMAIL]);
  });

  it('sets the new password once, and logs the user out everywhere', async () => {
    await verifiedUser();
    expect(await db.select().from(session)).toHaveLength(1);

    await requestReset();
    expect(outbox.map((e) => e.kind)).toEqual(['reset-password']);
    const token = await tokenFromLink();

    expect((await post('/reset-password', { token, newPassword: NEW_PASSWORD })).status).toBe(200);
    expect(await db.select().from(session)).toHaveLength(0);
    expect((await signIn(PASSWORD)).status).toBe(401);
    expect((await signIn(NEW_PASSWORD)).status).toBe(200);

    const again = await post('/reset-password', { token, newPassword: 'yet another passphrase' });
    expect(again.status).toBe(400);
    expect(await again.json()).toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('makes a link that lasts exactly one hour', async () => {
    await verifiedUser();
    const before = Date.now();
    await requestReset();
    const token = await tokenFromLink();
    const [row] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, `reset-password:${token}`));
    const minutes = (row!.expiresAt.getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(59);
    expect(minutes).toBeLessThanOrEqual(60.1);
  });

  it('refuses a link once its hour is up', async () => {
    await verifiedUser();
    await requestReset();
    const token = await tokenFromLink();
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.identifier, `reset-password:${token}`));

    expect((await post('/reset-password', { token, newPassword: NEW_PASSWORD })).status).toBe(400);
    const expired = await get(linkFor(EMAIL));
    expect(expired.headers.get('location')).toContain('error=INVALID_TOKEN');
  });

  it('applies the password policy to the new password', async () => {
    await verifiedUser();
    await requestReset();
    const token = await tokenFromLink();
    expect((await post('/reset-password', { token, newPassword: 'short' })).status).toBe(400);
  });
});
