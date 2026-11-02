import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from './testing';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

describe('migration 0000', () => {
  it('installs pg_trgm for typo-tolerant search', async () => {
    const { rows } = await db.execute(
      sql`select word_similarity('khadar', 'black khaddar suit') as s`,
    );
    expect(Number(rows[0]!.s)).toBeGreaterThan(0.4);
  });

  it('creates immutable_array_to_string for the generated search column', async () => {
    const { rows } = await db.execute(sql`
      select immutable_array_to_string(array['a', 'b'], ' ') as joined,
             (select provolatile from pg_proc where proname = 'immutable_array_to_string') as volatility`);
    expect(rows[0]).toEqual({ joined: 'a b', volatility: 'i' });
  });
});
