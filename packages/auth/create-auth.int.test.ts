import { account, session, user } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { COOKIE_PREFIX, createAuth, hashIp } from './index';

const SECRET = 'test-secret-for-integration-tests-only-0123456789';
const PASSWORD = 'correct horse battery staple';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterEach(() => resetTestDb(db));
afterAll(() => db.$client.close());

const webAuth = (baseURL = 'http://localhost:3000') =>
  createAuth({ app: 'web', db, baseURL, secret: SECRET });

const signUp = (auth: ReturnType<typeof webAuth>, body: Record<string, unknown>) =>
  auth.api.signUpEmail({ body: { name: 'Ayesha', password: PASSWORD, ...body } as never });

// Raw HTTP, so the test sees the real status, body and cookies.
const post = (auth: ReturnType<typeof webAuth>, path: string, body: unknown) =>
  auth.handler(
    new Request(`${auth.options.baseURL}/api/auth${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: auth.options.baseURL!,
        'x-nf-client-connection-ip': '203.0.113.7',
      },
      body: JSON.stringify(body),
    }),
  );

describe('sign-up', () => {
  it('stores the email in lower case and the password only as a scrypt hash', async () => {
    await signUp(webAuth(), { email: 'Ayesha.Khan@Example.com' });

    const [row] = await db.select().from(user);
    expect(row?.email).toBe('ayesha.khan@example.com');
    expect(row?.role).toBe('customer');
    expect(row?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    const [credential] = await db.select().from(account);
    expect(credential?.providerId).toBe('credential');
    expect(credential?.password).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('keeps the plain password out of every column of every table', async () => {
    await signUp(webAuth(), { email: 'ayesha@example.com' });
    const tables = ['user', 'account', 'session', 'verification', 'two_factor'];
    const rows = [];
    for (const table of tables) {
      rows.push((await db.execute(sql.raw(`SELECT row_to_json(t)::text FROM "${table}" t`))).rows);
    }
    expect(rows[1]).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(PASSWORD);
  });

  it("can't make an admin, whatever the request says", async () => {
    const response = await post(webAuth(), '/sign-up/email', {
      name: 'Mallory',
      email: 'mallory@example.com',
      password: PASSWORD,
      role: 'admin',
      banned: false,
    });
    // Better Auth drops fields marked input: false; step 3.4's strict schema refuses them outright.
    expect(response.status).toBe(200);
    const [row] = await db.select().from(user);
    expect(row?.role).toBe('customer');
    expect(row?.banned).toBe(false);
  });

  it('gives every account a different time-ordered id', async () => {
    const auth = webAuth();
    await signUp(auth, { email: 'one@example.com' });
    await signUp(auth, { email: 'two@example.com' });
    const ids = (await db.select({ id: user.id }).from(user)).map((r) => r.id).sort();
    expect(new Set(ids).size).toBe(2);
  });
});

describe('sign-in', () => {
  it('records the session as a web session with a hashed IP', async () => {
    const auth = webAuth();
    await signUp(auth, { email: 'ayesha@example.com' });
    const response = await post(auth, '/sign-in/email', {
      email: 'ayesha@example.com',
      password: PASSWORD,
    });
    expect(response.status).toBe(200);

    const [row] = await db.select().from(session);
    expect(row?.app).toBe('web');
    expect(row?.ipAddress).toBe(hashIp('203.0.113.7', SECRET));
    expect(row?.ipAddress).not.toContain('203.0.113.7');
  });

  it('gives a banned user exactly the wrong-password answer', async () => {
    const auth = webAuth();
    await signUp(auth, { email: 'banned@example.com' });
    await db.update(user).set({ banned: true }).where(eq(user.email, 'banned@example.com'));

    const banned = await post(auth, '/sign-in/email', {
      email: 'banned@example.com',
      password: PASSWORD,
    });
    const wrong = await post(auth, '/sign-in/email', {
      email: 'banned@example.com',
      password: 'not the password at all',
    });
    expect(banned.status).toBe(wrong.status);
    expect(await banned.json()).toEqual(await wrong.json());
    expect(await db.select().from(session)).toHaveLength(0);
  });

  it('sets a host-only, HttpOnly, SameSite=Lax cookie with the app prefix', async () => {
    const auth = webAuth();
    await signUp(auth, { email: 'ayesha@example.com' });
    const response = await post(auth, '/sign-in/email', {
      email: 'ayesha@example.com',
      password: PASSWORD,
    });
    const cookie = response.headers.getSetCookie().find((c) => c.includes('session_token'));
    expect(cookie).toMatch(new RegExp(`^${COOKIE_PREFIX.web}\\.session_token=`));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('marks the cookie Secure, with the __Secure- prefix, on an https site', async () => {
    const auth = webAuth('https://mustafaapparels.com');
    await signUp(auth, { email: 'ayesha@example.com' });
    const response = await post(auth, '/sign-in/email', {
      email: 'ayesha@example.com',
      password: PASSWORD,
    });
    const cookie = response.headers.getSetCookie().find((c) => c.includes('session_token'));
    expect(cookie).toMatch(/^__Secure-ma\.session_token=/);
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).not.toMatch(/Domain=/i);
  });
});

describe('admin instance', () => {
  const adminAuth = () =>
    createAuth({ app: 'admin', db, baseURL: 'http://localhost:3001', secret: SECRET });

  it('refuses sign-up', async () => {
    const response = await post(adminAuth(), '/sign-up/email', {
      name: 'Mallory',
      email: 'mallory@example.com',
      password: PASSWORD,
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await db.select().from(user)).toHaveLength(0);
  });

  it('records admin sessions under its own cookie, lasting 12 hours without sliding', async () => {
    await signUp(webAuth(), { email: 'owner@example.com' });
    const before = Date.now();
    const response = await post(adminAuth(), '/sign-in/email', {
      email: 'owner@example.com',
      password: PASSWORD,
    });
    const cookie = response.headers.getSetCookie().find((c) => c.includes('session_token'));
    expect(cookie).toMatch(/^ma-admin\.session_token=/);

    const [row] = await db.select().from(session);
    expect(row?.app).toBe('admin');
    const hours = (row!.expiresAt.getTime() - before) / 3_600_000;
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThanOrEqual(12.01);
    expect(adminAuth().options.session?.disableSessionRefresh).toBe(true);
  });
});

describe('options', () => {
  it('hands slow work to the background runner when the app gives one', () => {
    const background = () => {};
    const auth = createAuth({
      app: 'web',
      db,
      baseURL: 'http://localhost:3000',
      secret: SECRET,
      background,
    });
    expect(auth.options.advanced?.backgroundTasks?.handler).toBe(background);
    expect(webAuth().options.advanced?.backgroundTasks).toBeUndefined();
  });

  it('stores no IP when the request carries none', async () => {
    const auth = webAuth();
    await signUp(auth, { email: 'ayesha@example.com' });
    await auth.api.signInEmail({ body: { email: 'ayesha@example.com', password: PASSWORD } });
    const [row] = await db.select().from(session);
    expect(row?.ipAddress).toBeNull();
  });

  it('refuses a session for a user that no longer exists', async () => {
    const auth = webAuth();
    const ctx = await auth.$context;
    await expect(ctx.internalAdapter.createSession('no-such-user', false)).rejects.toThrow();
  });
});
