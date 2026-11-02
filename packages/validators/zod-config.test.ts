import { expect, it } from 'vitest';
import { z } from 'zod';

import { signInInput } from './auth';

it('parses without eval, so strict CSP pages report nothing', () => {
  expect(z.config().jitless).toBe(true);
  expect(signInInput.parse({ email: 'a@example.com', password: 'x' }).email).toBe('a@example.com');
});
