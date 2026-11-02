// @vitest-environment node
// docs/auth-security.md §2 A01: every admin server action refuses a customer and a signed-out
// visitor. Every app/**/actions.ts is found automatically, so a new action is covered the day
// it's added. Each export is called with junk input: the guard must answer before the input
// is looked at, and before any database or Better Auth call.
import { requireAdmin as guardAdmin } from '@mustafa/auth/guards';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as unknown }));
const reached = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../lib/auth', () => ({
  getSession: async () => session.current,
  requireAdmin: async () => guardAdmin(session.current as never),
  getAuth: () => {
    reached();
    throw new Error('an action reached Better Auth before its guard');
  },
}));
vi.mock('@mustafa/db/client', () => ({
  getDb: () => {
    reached();
    throw new Error('an action reached the database before its guard');
  },
}));

const modules = import.meta.glob('../app/**/actions.ts', { eager: true }) as Record<
  string,
  Record<string, unknown>
>;
const actions = Object.entries(modules).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(([, value]) => typeof value === 'function')
    .map(([name, fn]) => [`${file.replace('../app/', '')} → ${name}`, fn] as const),
);

const customer = {
  user: { id: 'c1', role: 'customer', banned: false, twoFactorEnabled: false },
  session: { app: 'admin' },
};
const storefrontAdmin = {
  user: { id: 'a1', role: 'admin', banned: false, twoFactorEnabled: true },
  session: { app: 'web' },
};

beforeEach(() => {
  reached.mockReset();
});

it('finds the admin actions', () => {
  expect(actions.length).toBeGreaterThan(0);
});

describe.each(actions)('%s', (_name, action) => {
  const call = (current: unknown) => {
    session.current = current;
    return (action as (input: unknown) => Promise<unknown>)({
      id: 'x',
      password: 'x',
      role: 'admin',
    });
  };

  it('answers UNAUTHENTICATED when signed out', async () => {
    expect(await call(null)).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    expect(reached).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN to a customer', async () => {
    expect(await call(customer)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(reached).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN to a storefront session, even an admin’s', async () => {
    expect(await call(storefrontAdmin)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(reached).not.toHaveBeenCalled();
  });
});
