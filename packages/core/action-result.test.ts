import { describe, expect, it } from 'vitest';

import { fail, ok, toActionError } from './action-result';
import { CoreError, forbidden, invalid, notFound, rateLimited, unauthenticated } from './errors';

describe('ActionResult', () => {
  it('wraps data in ok', () => {
    expect(ok({ id: 'a' })).toEqual({ ok: true, data: { id: 'a' } });
  });

  it('builds a failure with optional field errors', () => {
    expect(fail('VALIDATION', 'Check', { name: ['Too short'] })).toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Check', fieldErrors: { name: ['Too short'] } },
    });
    expect(fail('FORBIDDEN', 'No')).toEqual({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'No' },
    });
  });
});

describe('toActionError', () => {
  it.each([
    [notFound('Suit'), 'NOT_FOUND', 'Suit not found'],
    [new CoreError('CONFLICT', 'That slug is taken'), 'CONFLICT', 'That slug is taken'],
    [unauthenticated(), 'UNAUTHENTICATED', 'Please log in to continue.'],
    [forbidden(), 'FORBIDDEN', "You don't have access to this."],
    [rateLimited(), 'RATE_LIMITED', 'Too many attempts. Please try again in a few minutes.'],
  ])('keeps the code and safe message of %s', (error, code, message) => {
    expect(toActionError(error)).toEqual({ ok: false, error: { code, message } });
  });

  it('keeps field errors from a validation error', () => {
    expect(toActionError(invalid({ price: ['Add a price'] })).error.fieldErrors).toEqual({
      price: ['Add a price'],
    });
  });

  it('never passes on the message of an unexpected error', () => {
    const result = toActionError(new Error('relation "user" does not exist at db.internal:5432'));
    expect(result).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    });
    expect(toActionError('a string').error.code).toBe('INTERNAL');
  });
});
