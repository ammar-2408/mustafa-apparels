// packages/core, validators and auth, per docs/testing-qa.md §5.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Integration tests start an in-memory Postgres (PGlite), which can take seconds under load.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      // Listed so a file with no tests still counts against the floor.
      include: ['**/*.ts'],
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
