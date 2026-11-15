// `pnpm e2e:db`: migrate the local E2E database (the Neon `e2e` branch) and add the demo suits.
// The child commands load .env.local too, but process.loadEnvFile never overwrites a set value,
// so the URL set here wins over DATABASE_URL (the dev branch).
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { loadEnvFiles } from '@mustafa/config/env';

import { e2eServerEnv } from './e2e/database-url';

loadEnvFiles();
const env = { ...process.env, ...e2eServerEnv() };

// The seed writes to the database directly, so no cache tag is refreshed: the storefront's local
// data cache would keep serving lists from before it (a new page 2 would still be a 404).
export const WEB_DATA_CACHES = ['.next/cache/fetch-cache', '.next/dev/cache/fetch-cache'];

function clearWebDataCache() {
  const web = join(__dirname, '..', 'apps', 'web');
  for (const dir of WEB_DATA_CACHES) rmSync(join(web, dir), { recursive: true, force: true });
}

if (require.main === module) {
  // Runs inside packages/db (see the root `e2e:db` script), so these are that package's scripts.
  // One command string: Windows needs a shell to find pnpm.cmd.
  let failed = false;
  for (const command of ['pnpm run migrate', 'pnpm run seed -- --e2e']) {
    const result = spawnSync(command, { env, stdio: 'inherit', shell: true });
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      failed = true;
      break;
    }
  }
  if (!failed) {
    clearWebDataCache();
    console.log('Cleared the storefront data cache, so pages show the seeded suits.');
  }
}
