// @vitest-environment node
import { forbidden, notFound, unauthenticated } from '@mustafa/core/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('./auth', () => ({ requireAdmin }));

import { adminAction } from './action';

const ADMIN = { user: { id: 'a1' }, session: { app: 'admin' } };
const rename = adminAction(z.object({ name: z.string().min(2) }).strict(), async (input, ctx) => ({
  name: input.name,
  by: ctx.session.user.id,
}));

beforeEach(() => {
  requireAdmin.mockReset();
});

describe('adminAction', () => {
  it('checks the admin first, then the input, then does the work', async () => {
    requireAdmin.mockResolvedValue(ADMIN);
    expect(await rename({ name: 'Dhanak' })).toEqual({
      ok: true,
      data: { name: 'Dhanak', by: 'a1' },
    });
  });

  const refusedBy = async (guardError: () => Error) => {
    requireAdmin.mockImplementation(async () => {
      throw guardError();
    });
    const handler = vi.fn();
    const result = await adminAction(z.object({}).strict(), handler)({ anything: true });
    expect(handler).not.toHaveBeenCalled();
    return result;
  };

  it('stops a signed-out visitor before reading the input', async () => {
    expect(await refusedBy(unauthenticated)).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    });
  });

  it('stops a visitor who is not an admin before reading the input', async () => {
    expect(await refusedBy(forbidden)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('refuses invalid input and extra fields with field errors', async () => {
    requireAdmin.mockResolvedValue(ADMIN);
    expect(await rename({ name: 'D' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', fieldErrors: { name: expect.any(Array) } },
    });
    expect(await rename({ name: 'Dhanak', role: 'admin' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });

  it('passes on our own errors and hides unexpected ones', async () => {
    requireAdmin.mockResolvedValue(ADMIN);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const missing = adminAction(z.object({}), async () => {
      throw notFound('Suit');
    });
    expect(await missing({})).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const broken = adminAction(z.object({}), async () => {
      throw new Error('relation "product" does not exist');
    });
    expect(await broken({})).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('product');
    log.mockRestore();
  });
});
