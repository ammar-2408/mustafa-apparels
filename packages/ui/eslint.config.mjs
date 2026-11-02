import base from '@mustafa/config/eslint/base';
import next from '@mustafa/config/eslint/next';
import { defineConfig } from 'eslint/config';

export default defineConfig([base, next, { settings: { next: { rootDir: ['../../apps/*/'] } } }]);
