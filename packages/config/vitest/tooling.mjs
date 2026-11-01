// Tests that spawn ESLint, Prettier or the compiler: slower, and no coverage floor.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60_000,
    coverage: { provider: 'v8' },
  },
});
