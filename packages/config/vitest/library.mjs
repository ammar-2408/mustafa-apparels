// packages/core, validators and auth, per docs/testing-qa.md §5.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Integration tests start an in-memory Postgres (PGlite). On its own that takes a few seconds,
    // but a full run starts one in every package at once, and 30 s was seen to run out.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      // Listed so a file with no tests still counts against the floor.
      include: ['**/*.ts'],
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
