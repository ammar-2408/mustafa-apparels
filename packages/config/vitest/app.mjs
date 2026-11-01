// Next.js apps. The floor applies to server code only, per docs/testing-qa.md §5.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      // Listed so a file with no tests still counts against the floor.
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      thresholds: {
        'app/**/actions.ts': { lines: 80 },
        'app/**/route.ts': { lines: 80 },
      },
    },
  },
});
