// Which database E2E uses. GitHub Actions: its throwaway Postgres (DATABASE_URL). Everywhere else,
// including a local `CI=1` run against a build (docs/debugging.md), the Neon `e2e` branch in
// E2E_DATABASE_URL, never the `dev` branch the admin uses (docs/testing-qa.md §4).
type Env = Record<string, string | undefined>;

// Neon's pooled and direct URLs differ only by "-pooler" in the host, so compare host + database.
function databaseKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace('-pooler.', '.')}${parsed.pathname}`.toLowerCase();
  } catch {
    return url;
  }
}

export function e2eDatabaseUrl(env: Env = process.env): string {
  if (env.GITHUB_ACTIONS === 'true') {
    const url = env.DATABASE_URL?.trim();
    if (!url) throw new Error('E2E on GitHub Actions needs DATABASE_URL (the Postgres service)');
    return url;
  }
  const url = env.E2E_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'Local E2E needs E2E_DATABASE_URL in .env.local: the Neon `e2e` branch (docs/testing-qa.md §4). It never runs on the dev database.',
    );
  }
  const key = databaseKey(url);
  const devKeys = [env.DATABASE_URL, env.DATABASE_URL_UNPOOLED]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map(databaseKey);
  if (devKeys.includes(key)) {
    throw new Error(
      'E2E_DATABASE_URL points at the same database as DATABASE_URL. Use the Neon `e2e` branch.',
    );
  }
  return url;
}

// Env for both web servers, so the apps read and write the same database as the fixtures.
export function e2eServerEnv(env: Env = process.env): Record<string, string> {
  const url = e2eDatabaseUrl(env);
  return { DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
}
