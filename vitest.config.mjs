import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/*',
      'packages/*',
      {
        test: {
          name: 'workspace',
          include: ['scripts/**/*.test.mjs'],
          environment: 'node',
          testTimeout: 60_000,
        },
      },
    ],
  },
});
