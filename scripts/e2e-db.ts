// `pnpm e2e:db`: migrate the local E2E database (the Neon `e2e` branch) and add the demo suits.
// The child commands load .env.local too, but process.loadEnvFile never overwrites a set value,
// so the URL set here wins over DATABASE_URL (the dev branch).
import { spawnSync } from 'node:child_process';

import { loadEnvFiles } from '@mustafa/config/env';

import { e2eServerEnv } from './e2e/database-url';

loadEnvFiles();
const env = { ...process.env, ...e2eServerEnv() };

// Runs inside packages/db (see the root `e2e:db` script), so these are that package's scripts.
// One command string: Windows needs a shell to find pnpm.cmd.
for (const command of ['pnpm run migrate', 'pnpm run seed -- --e2e']) {
  const result = spawnSync(command, { env, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
