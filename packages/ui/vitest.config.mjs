// Same jsdom setup as the apps; components live in src/.
import app from '@mustafa/config/vitest/app';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(app, { test: { coverage: { include: ['src/**/*.tsx'] } } });
