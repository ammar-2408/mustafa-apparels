import { account, session, user } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { hashPassword } from 'better-auth/crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { requireAdmin } from './guards';
import { createAuth } from './index';
import { linkFor, sendEmail } from './test/outbox';

const SECRET = 'test-secret-for-integration-tests-only-0123456789';
const PASSWORD = 'correct horse battery staple';
const ADMIN_URL = 'http://localhost:3001';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(() => resetTestDb(db));
afterAll(() => db.$client.close());

const adminAuth = () =>
  createAuth({ app: 'admin', db, baseURL: ADMIN_URL, secret: SECRET, sendEmail });
const webAuth = () =>
  createAuth({ app: 'web', db, baseURL: 'http://localhost:3000', secret: SECRET, sendEmail });

const account_ = async (email: string, role: 'admin' | 'customer') => {
  const [row] = await db
    .insert(user)
    .values({ name: role, email, role, emailVerified: true })
    .returning();
  await db.insert(account).values({
    userId: row!.id,
    accountId: row!.id,
    providerId: 'credential',
    password: await hashPassword(PASSWORD),
  });
};

const signIn = (auth: ReturnType<typeof adminAuth>, email: string, password = PASSWORD) =>
  auth.handler(
    new Request(`${auth.options.baseURL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: auth.options.baseURL! },
      body: JSON.stringify({ email, password }),
    }),
  );

const tokenFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .find((c) => c.includes('session_token='))!
    .split(';')[0]!
    .split('=')
    .slice(1)
    .join('=');

describe('storefront sign-in', () => {
  it('refuses an admin account with the wrong-password answer, so 2FA is never skipped', async () => {
    await account_('owner@example.com', 'admin');
    const response = await signIn(webAuth(), 'owner@example.com');
    const wrong = await signIn(webAuth(), 'owner@example.com', 'not the password');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(await wrong.json());
  });

  it('has no 2FA endpoints', async () => {
    const response = await webAuth().handler(
      new Request('http://localhost:3000/api/auth/two-factor/enable', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({ password: PASSWORD }),
      }),
    );
    expect(response.status).toBe(404);
  });
});

describe('admin sign-in', () => {
  it('signs in an admin with an admin session', async () => {
    await account_('owner@example.com', 'admin');
    const response = await signIn(adminAuth(), 'owner@example.com');
    expect(response.status).toBe(200);
    const [row] = await db.select().from(session);
    expect(row?.app).toBe('admin');
  });

  it('gives a customer with the right password exactly the wrong-password answer', async () => {
    await account_('ayesha@example.com', 'customer');
    const customer = await signIn(adminAuth(), 'ayesha@example.com');
    const wrong = await signIn(adminAuth(), 'ayesha@example.com', 'not the password');
    const unknown = await signIn(adminAuth(), 'nobody@example.com');
    expect(customer.status).toBe(401);
    const body = await customer.json();
    expect(await wrong.json()).toEqual(body);
    expect(await unknown.json()).toEqual(body);
    expect(await db.select().from(session)).toHaveLength(0);
  });

  it("refuses a storefront session replayed on the admin, even an admin's", async () => {
    // Signed in on the storefront while still a customer, then made an admin with 2FA.
    await account_('owner@example.com', 'customer');
    const fromWeb = await signIn(webAuth(), 'owner@example.com');
    expect(fromWeb.status).toBe(200);
    await db.update(user).set({ role: 'admin', twoFactorEnabled: true });

    const replayed = await adminAuth().api.getSession({
      headers: new Headers({ cookie: `ma-admin.session_token=${tokenFrom(fromWeb)}` }),
    });
    expect(replayed?.session.app).toBe('web');
    expect(() => requireAdmin(replayed)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it("doesn't read the storefront's cookie at all", async () => {
    await account_('owner@example.com', 'customer');
    const fromWeb = await signIn(webAuth(), 'owner@example.com');
    await db.update(user).set({ role: 'admin' });
    const seen = await adminAuth().api.getSession({
      headers: new Headers({ cookie: `ma.session_token=${tokenFrom(fromWeb)}` }),
    });
    expect(seen).toBeNull();
  });
});

describe('admin sessions come only from sign-in and 2FA', () => {
  it('has no email verification endpoints, so a verify link opens no admin session', async () => {
    await account_('newadmin@example.com', 'admin');
    await db.update(user).set({ emailVerified: false });

    // A real verification link, made by the storefront instance (same secret in tests).
    const web = webAuth();
    await web.api.sendVerificationEmail({
      body: { email: 'newadmin@example.com', callbackURL: '/' },
    });
    const token = new URL(linkFor('newadmin@example.com')).searchParams.get('token')!;

    const verify = await adminAuth().handler(
      new Request(`${ADMIN_URL}/api/auth/verify-email?token=${token}&callbackURL=/`),
    );
    expect(verify.status).toBe(404);
    const send = await adminAuth().handler(
      new Request(`${ADMIN_URL}/api/auth/send-verification-email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ADMIN_URL },
        body: JSON.stringify({ email: 'newadmin@example.com' }),
      }),
    );
    expect(send.status).toBe(404);
    expect(await db.select().from(session)).toHaveLength(0);
  });

  it('refuses a session made any other way, even for an admin', async () => {
    await account_('owner@example.com', 'admin');
    const [owner] = await db.select().from(user);
    const ctx = await adminAuth().$context;
    await expect(ctx.internalAdapter.createSession(owner!.id, false)).rejects.toThrow();
    expect(await db.select().from(session)).toHaveLength(0);
  });
});
