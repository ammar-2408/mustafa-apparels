// In-memory Postgres for integration tests: PGlite with the real migrations applied.
// Start one per test file with createTestDb(), and call resetTestDb() between tests.
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import { MIGRATIONS_FOLDER } from './migrate';
import * as schema from './schema';

export async function createTestDb() {
  const db = drizzle({ client: new PGlite({ extensions: { pg_trgm } }), schema });
  await migrate(db, { migrationsFolder: fileURLToPath(MIGRATIONS_FOLDER) });
  return db;
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const tableNames = Object.values(schema as Record<string, unknown>)
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => `"${getTableName(table)}"`)
  .join(', ');

// TRUNCATE skips row triggers, so it also clears the insert-only audit log.
export async function resetTestDb(db: TestDb) {
  await db.execute(sql.raw(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`));
}
