// `pnpm db:generate` only. Migrations are applied by bin/migrate.ts (docs/database.md §5).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema/index.ts',
  out: './migrations',
  strict: true,
});
