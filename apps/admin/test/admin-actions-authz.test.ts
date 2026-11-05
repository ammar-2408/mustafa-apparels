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
const bannedAdmin = {
  user: { id: 'a2', role: 'admin', banned: true, twoFactorEnabled: true },
  session: { app: 'admin' },
};
const adminWithout2fa = {
  user: { id: 'a3', role: 'admin', banned: false, twoFactorEnabled: false },
  session: { app: 'admin' },
};
// The only action an admin may call before turning 2FA on: the one that turns it on.
const BEFORE_2FA = new Set(['startTwoFactorSetup']);

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

// The loop above only sees files named actions.ts, and so does the 80% coverage floor
// (packages/config/vitest/app.mjs). A server action anywhere else would slip past both.
const sources = import.meta.glob(['../{app,components,lib}/**/*.{ts,tsx}', '!**/*.test.*'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

it('keeps every server action in a file named actions.ts', () => {
  expect(Object.keys(sources).length).toBeGreaterThan(0);
  const strays = Object.entries(sources)
    .filter(([, source]) => /^\s*['"]use server['"]/m.test(source))
    .map(([file]) => file)
    .filter((file) => !file.endsWith('/actions.ts'));
  expect(strays).toEqual([]);
});

describe.each(actions)('%s', (name, action) => {
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

  it('answers FORBIDDEN to a banned admin', async () => {
    expect(await call(bannedAdmin)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(reached).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN to an admin who has not set up 2FA, except to set it up', async () => {
    const result = await call(adminWithout2fa);
    if (BEFORE_2FA.has(name.split(' → ').at(-1) ?? '')) {
      // Allowed past the guard; the junk input then fails validation before Better Auth.
      expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    } else {
      expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    }
    expect(reached).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN to a storefront session, even an admin’s', async () => {
    expect(await call(storefrontAdmin)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(reached).not.toHaveBeenCalled();
  });
});

// The same loop for route handlers: every app/api/**/route.ts except Better Auth's own.
vi.mock('../lib/media', () => ({ mockUploadsAllowed: () => true, mediaConfig: () => ({}) }));

const routeModules = import.meta.glob(['../app/api/**/route.ts', '!../app/api/auth/**'], {
  eager: true,
}) as Record<string, Record<string, unknown>>;
const handlers = Object.entries(routeModules).flatMap(([file, exports]) =>
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    .filter((method) => typeof exports[method] === 'function')
    .map((method) => [`${file.replace('../app/', '')} ${method}`, exports[method]] as const),
);

it('finds the admin route handlers', () => {
  expect(handlers.length).toBeGreaterThan(0);
});

describe.each(handlers)('%s', (_name, handler) => {
  const call = async (current: unknown) => {
    session.current = current;
    const response = await (handler as (request: Request) => Promise<Response>)(
      new Request('http://localhost:3001/api/x', { method: 'POST', body: '{}' }),
    );
    return response.status;
  };

  it('answers 401 when signed out', async () => {
    expect(await call(null)).toBe(401);
    expect(reached).not.toHaveBeenCalled();
  });

  it('answers 403 to a customer, a banned admin, a pre-2FA admin and a storefront session', async () => {
    for (const current of [customer, bannedAdmin, adminWithout2fa, storefrontAdmin]) {
      expect(await call(current)).toBe(403);
    }
    expect(reached).not.toHaveBeenCalled();
  });
});
