import { CoreError } from '@mustafa/core/errors';
import { describe, expect, it } from 'vitest';

import { assertOwner, requireUser } from './guards';

const session = (user: Record<string, unknown> = {}) => ({
  user: { id: 'u1', role: 'customer', banned: false, ...user },
  session: { app: 'web' },
});

const codeOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CoreError);
    return (error as CoreError).code;
  }
  throw new Error('expected a throw');
};

describe('requireUser', () => {
  it('returns the session of a signed-in user', () => {
    const current = session();
    expect(requireUser(current)).toBe(current);
  });

  it('throws UNAUTHENTICATED with no session', () => {
    expect(codeOf(() => requireUser(null))).toBe('UNAUTHENTICATED');
  });

  it('treats a banned user as signed out', () => {
    expect(codeOf(() => requireUser(session({ banned: true })))).toBe('UNAUTHENTICATED');
  });
});

describe('assertOwner', () => {
  it('passes for the owner', () => {
    expect(() => assertOwner('u1', 'u1')).not.toThrow();
  });

  it('throws FORBIDDEN for anyone else, including a missing owner', () => {
    expect(codeOf(() => assertOwner('u1', 'u2'))).toBe('FORBIDDEN');
    expect(codeOf(() => assertOwner('u1', null))).toBe('FORBIDDEN');
  });
});
