// Runs before dev, build and start, not from next.config.ts: `next typegen` loads that file too,
// and typecheck must work without env. Prints variable names only, so it's safe to share the output.
import { fileURLToPath } from 'node:url';

import { EnvError, loadEnvFiles, parseEnv } from './env.ts';

const app = process.argv[2];

if (app !== 'web' && app !== 'admin') {
  console.error('Usage: check-env <web|admin>');
  process.exit(1);
}

loadEnvFiles(fileURLToPath(new URL(`../../apps/${app}/`, import.meta.url)));

try {
  parseEnv(app);
} catch (error) {
  if (!(error instanceof EnvError)) throw error;
  console.error(error.message);
  console.error(
    '\nLocally, run "cp .env.example .env.local" in the repo root if you have not yet. See docs/setup.md §6.',
  );
  process.exit(1);
}
