// @vitest-environment node
import { expect, it, vi } from 'vitest';

const revalidator = vi.hoisted(() => vi.fn(async () => {}));
const createRevalidator = vi.hoisted(() => vi.fn(() => revalidator));
vi.mock('server-only', () => ({}));
vi.mock('@mustafa/config/env', () => ({
  getEnv: () => ({
    INTEGRATIONS_MODE: 'live',
    WEB_URL: 'https://mustafaapparels.com',
    REVALIDATE_SECRET: 'r'.repeat(40),
  }),
}));
vi.mock('@mustafa/core/integrations/revalidate', () => ({ createRevalidator }));

import { revalidateStorefront } from './revalidate';

it('builds one revalidator from the env and passes the tags to it', async () => {
  await revalidateStorefront(['products']);
  await revalidateStorefront(['settings']);
  expect(createRevalidator).toHaveBeenCalledTimes(1);
  expect(createRevalidator).toHaveBeenCalledWith({
    mode: 'live',
    webUrl: 'https://mustafaapparels.com',
    secret: 'r'.repeat(40),
  });
  expect(revalidator.mock.calls).toEqual([[['products']], [['settings']]]);
});
