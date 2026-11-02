// Decides whether `pnpm db:migrate` runs. Migrations use the direct (unpooled) URL.
// A mock-mode preview may have no database yet (docs/deployment.md §2), so it skips;
// production and live mode must have one, so a missing URL fails the build.
type Env = Record<string, string | undefined>;

export type MigrationPlan = { run: true; url: string } | { run: false; note: string };

export function migrationPlan(env: Env): MigrationPlan {
  const url = env.DATABASE_URL_UNPOOLED?.trim();
  if (url) return { run: true, url };
  const mock = env.INTEGRATIONS_MODE?.trim() === 'mock';
  if (mock && env.APP_ENV?.trim() !== 'production') {
    return {
      run: false,
      note: 'Skipping migrations: DATABASE_URL_UNPOOLED is not set (mock mode, no database yet).',
    };
  }
  throw new Error('DATABASE_URL_UNPOOLED is missing');
}

export const MIGRATIONS_FOLDER = new URL('./migrations', import.meta.url);
