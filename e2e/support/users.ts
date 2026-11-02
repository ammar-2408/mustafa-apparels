// Test accounts written straight to the test database, one set per test, and removed after it.
// CI uses its throwaway Postgres; locally this is the Neon `dev` branch from .env.local, never
// production. Each test also gets its own client IP, so parallel projects never share a
// rate-limit bucket (Better Auth reads x-nf-client-connection-ip, as on Netlify).
import { randomInt, randomUUID } from 'node:crypto';

import { loadEnvFiles } from '@mustafa/config/env';
import { createDb, type Database } from '@mustafa/db/client';
import { account, user } from '@mustafa/db/schema';
import { test as base } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import { inArray } from 'drizzle-orm';

export const PASSWORD = 'e2e correct horse battery';

export type TestUser = { id: string; name: string; email: string; password: string };

type UserOptions = { role?: 'customer' | 'admin'; verified?: boolean; password?: string };

export type Users = {
  create(options?: UserOptions): Promise<TestUser>;
  // A fresh address no account uses yet; whatever the test creates with it is removed after.
  freshEmail(): string;
};

export const uniqueEmail = () => `e2e+${randomUUID()}@example.com`;

const randomIp = () => `198.51.${randomInt(0, 256)}.${randomInt(1, 255)}`;

export const test = base.extend<{ users: Users }, { db: Database }>({
  db: [
    // Playwright reads a fixture's dependencies from an object pattern, so this one must be empty.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      loadEnvFiles();
      const url = process.env.DATABASE_URL?.trim();
      if (!url) throw new Error('E2E auth tests need DATABASE_URL (see docs/testing-qa.md §4)');
      const db = createDb(url);
      await use(db);
      await db.$client.end();
    },
    { scope: 'worker' },
  ],

  context: async ({ context }, use) => {
    await context.setExtraHTTPHeaders({ 'x-nf-client-connection-ip': randomIp() });
    await use(context);
  },

  users: async ({ db }, use) => {
    const emails: string[] = [];
    await use({
      freshEmail() {
        const email = uniqueEmail();
        emails.push(email);
        return email;
      },
      async create({ role = 'customer', verified = true, password = PASSWORD } = {}) {
        const email = uniqueEmail();
        emails.push(email);
        const name = role === 'admin' ? 'E2E Admin' : 'E2E Customer';
        const [row] = await db
          .insert(user)
          .values({ name, email, role, emailVerified: verified })
          .returning();
        await db.insert(account).values({
          userId: row!.id,
          accountId: row!.id,
          providerId: 'credential',
          password: await hashPassword(password),
        });
        return { id: row!.id, name, email, password };
      },
    });
    // Sessions, accounts and 2FA rows go with the user (on delete cascade).
    if (emails.length > 0) await db.delete(user).where(inArray(user.email, emails));
  },
});

export { expect } from '@playwright/test';
