import { loadEnvFiles } from '@mustafa/config/env';
import { defineConfig, devices } from '@playwright/test';

import { e2eServerEnv } from './scripts/e2e/database-url';
import { busyPortsMessage, portsInUse } from './scripts/e2e/ports';

const isCI = Boolean(process.env.CI);
// scripts/workspace.test.mjs imports this file to check its shape: no database or port checks then.
const inUnitTest = Boolean(process.env.VITEST);

// Local E2E runs on the Neon `e2e` branch, never `dev` (docs/testing-qa.md §4). Both servers get
// its URL, which wins over .env.local because Next never overwrites a variable that is already set.
loadEnvFiles();
const databaseEnv = inUnitTest ? {} : e2eServerEnv();

// A server already on 3000/3001 may be `pnpm dev` on the dev database, so a local run reuses it
// only with E2E_REUSE=1. On Windows, servers can outlive a run: `pnpm e2e:stop` clears them.
// Only the runner checks: each worker loads this file again once the servers are already up.
const reuse = !isCI && process.env.E2E_REUSE === '1';
const inWorker = process.env.TEST_WORKER_INDEX !== undefined;
if (!isCI && !reuse && !inUnitTest && !inWorker) {
  const busy = portsInUse([3000, 3001]);
  if (busy.length > 0) throw new Error(busyPortsMessage(busy));
}

const server = (app: string, port: number) => ({
  command: `pnpm --filter ${app} ${isCI ? 'start' : 'dev'}`,
  url: `http://localhost:${port}`,
  reuseExistingServer: reuse,
  env: databaseEnv,
  timeout: 120_000,
});

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-small',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
    },
    { name: 'mobile-ios', use: { ...devices['iPhone 15'] } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'tablet-landscape', use: { ...devices['iPad (gen 7) landscape'] } },
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'large',
      use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } },
    },
  ],
  webServer: [server('web', 3000), server('admin', 3001)],
});
