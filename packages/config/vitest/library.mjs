// packages/core, validators and auth, per docs/testing-qa.md §5.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Listed so a file with no tests still counts against the floor.
      include: ['**/*.ts'],
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
