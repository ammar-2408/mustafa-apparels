// `pnpm db:migrate`: applies packages/db/migrations to DATABASE_URL_UNPOOLED.
import { fileURLToPath } from 'node:url';

import { loadEnvFiles } from '@mustafa/config/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

import { migrationPlan, MIGRATIONS_FOLDER } from '../migrate';

loadEnvFiles();

try {
  const plan = migrationPlan(process.env);
  if (!plan.run) {
    console.log(plan.note);
  } else {
    const pool = new pg.Pool({ connectionString: plan.url, max: 1 });
    try {
      await migrate(drizzle({ client: pool }), {
        migrationsFolder: fileURLToPath(MIGRATIONS_FOLDER),
      });
      console.log('Migrations applied.');
    } finally {
      await pool.end();
    }
  }
} catch (error) {
  console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
