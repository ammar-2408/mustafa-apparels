import { Pool as NeonPool } from '@neondatabase/serverless';
import pg from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDb, type Database, getDb } from './client';

const SECRET = 'p4ssw0rd-never-printed';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createDb', () => {
  it('uses the Neon serverless driver for a Neon host', () => {
    const db = createDb(`postgresql://u:${SECRET}@ep-x-pooler.us-east-2.aws.neon.tech/neondb`);
    expect(db.$client).toBeInstanceOf(NeonPool);
  });

  it('uses node-postgres for any other host, such as the CI container', () => {
    const db = createDb(`postgresql://postgres:${SECRET}@localhost:5432/shop_test`);
    expect(db.$client).toBeInstanceOf(pg.Pool);
  });

  it('rejects a value that is not a URL, without echoing it', () => {
    expect(() => createDb(`not a url ${SECRET}`)).toThrowError(
      /^DATABASE_URL is not a valid postgresql:\/\/ URL$/,
    );
  });

  it('rejects a URL with another protocol, naming the variable it came from', () => {
    expect(() => createDb(`https://u:${SECRET}@example.com`, 'DATABASE_URL_UNPOOLED')).toThrowError(
      /^DATABASE_URL_UNPOOLED is not a valid postgresql:\/\/ URL$/,
    );
  });
});

describe('getDb', () => {
  it('fails clearly when DATABASE_URL is missing', () => {
    vi.stubEnv('DATABASE_URL', '');
    expect(() => getDb()).toThrowError('DATABASE_URL is missing');
  });

  it('reuses one client', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/shop_test');
    expect(getDb()).toBe(getDb());
  });
});

describe('Database type', () => {
  it('accepts the app client and the PGlite test client, so core can take either', async () => {
    const { createTestDb } = await import('./testing');
    const clients: Database[] = [
      createDb('postgresql://postgres:postgres@localhost:5432/shop_test'),
      await createTestDb(),
    ];
    expect(clients).toHaveLength(2);
  });
});
