// Library floor; the CLI wrapper and drizzle-kit config run outside tests.
import library from '@mustafa/config/vitest/library';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(library, {
  test: { coverage: { exclude: ['drizzle.config.ts', 'bin/**'] } },
});
