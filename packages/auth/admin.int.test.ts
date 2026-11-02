import { account, session, user } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { hashPassword } from 'better-auth/crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { requireAdmin } from './guards';
import { createAuth } from './index';
import { sendEmail } from './test/outbox';

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
    await account_('owner@example.com', 'admin');
    const fromWeb = await signIn(webAuth(), 'owner@example.com');
    expect(fromWeb.status).toBe(200);

    const replayed = await adminAuth().api.getSession({
      headers: new Headers({ cookie: `ma-admin.session_token=${tokenFrom(fromWeb)}` }),
    });
    expect(replayed?.session.app).toBe('web');
    expect(() => requireAdmin(replayed)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it("doesn't read the storefront's cookie at all", async () => {
    await account_('owner@example.com', 'admin');
    const fromWeb = await signIn(webAuth(), 'owner@example.com');
    const seen = await adminAuth().api.getSession({
      headers: new Headers({ cookie: `ma.session_token=${tokenFrom(fromWeb)}` }),
    });
    expect(seen).toBeNull();
  });
});
