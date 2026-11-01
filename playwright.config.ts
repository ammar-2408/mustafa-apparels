import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

// Local runs reuse a dev server that is already up, because on Windows they can survive stopping.
const server = (app: string, port: number) => ({
  command: `pnpm --filter ${app} ${isCI ? 'start' : 'dev'}`,
  url: `http://localhost:${port}`,
  reuseExistingServer: !isCI,
  timeout: 120_000,
});

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
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
