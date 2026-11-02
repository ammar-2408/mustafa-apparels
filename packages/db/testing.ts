// In-memory Postgres for integration tests: PGlite with the real migrations applied.
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
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
