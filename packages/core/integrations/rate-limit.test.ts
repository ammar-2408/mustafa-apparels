import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createLimiter, type Limit } from './rate-limit';

const UPSTASH = 'https://test-db.upstash.io';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

const login: Limit = { name: 'login', max: 3, windowSeconds: 60, failMode: 'closed' };
const signUp: Limit = { name: 'sign-up', max: 3, windowSeconds: 60, failMode: 'open' };
const KEY = '203.0.113.7|ayesha@example.com';

const mock = () => createLimiter({ mode: 'mock', appEnv: 'test', secret: 's'.repeat(40) });

const live = (log = vi.fn()) => ({
  limiter: createLimiter({
    mode: 'live',
    appEnv: 'production',
    secret: 's'.repeat(40),
    url: UPSTASH,
    token: 'token',
    timeoutMs: 100,
    log,
  }),
  log,
});

describe('counting (mock store)', () => {
  it('allows the limit, refuses one more, and allows again after the window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const limiter = mock();
    for (let i = 0; i < 3; i++) expect((await limiter.consume(login, KEY)).allowed).toBe(true);

    const refused = await limiter.consume(login, KEY);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfter).toBeGreaterThan(0);
    expect(refused.retryAfter).toBeLessThanOrEqual(60);

    vi.setSystemTime(Date.now() + 61_000);
    expect((await limiter.consume(login, KEY)).allowed).toBe(true);
  });

  it('keeps separate counts per key and per limit', async () => {
    const limiter = mock();
    for (let i = 0; i < 3; i++) await limiter.consume(login, KEY);
    expect((await limiter.consume(login, 'another|key')).allowed).toBe(true);
    expect((await limiter.consume(signUp, KEY)).allowed).toBe(true);
  });

  it('check never counts', async () => {
    const limiter = mock();
    for (let i = 0; i < 5; i++) expect((await limiter.check(login, KEY)).allowed).toBe(true);
    for (let i = 0; i < 3; i++) await limiter.consume(login, KEY);
    expect((await limiter.check(login, KEY)).allowed).toBe(false);
  });
});

describe('when Upstash is down, slow or over its limit', () => {
  const failWith = (response: (info: { request: Request }) => Response | Promise<Response>) =>
    server.use(http.post(`${UPSTASH}/*`, response), http.post(UPSTASH, response));

  it.each([
    [
      'an error',
      () => HttpResponse.json({ error: 'ERR max requests limit exceeded' }, { status: 400 }),
    ],
    ['a server error', () => HttpResponse.json({}, { status: 500 })],
    ['a network failure', () => HttpResponse.error()],
  ])('on %s: refuses login, lets sign-up through, and logs it', async (_name, response) => {
    failWith(response);
    const { limiter, log } = live();

    expect(await limiter.consume(login, KEY)).toEqual({
      allowed: false,
      retryAfter: 60,
      unavailable: true,
    });
    expect(await limiter.consume(signUp, KEY)).toEqual({
      allowed: true,
      retryAfter: null,
      unavailable: true,
    });
    expect(await limiter.check(login, KEY)).toMatchObject({ allowed: false, unavailable: true });
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[rate-limit\] login store unavailable/),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/sign-up store unavailable.*failing open/),
    );
  });

  it('treats a timeout as down, not as allowed', async () => {
    failWith(async () => {
      await delay(1000);
      return HttpResponse.json({ result: [1, 1] });
    });
    const { limiter } = live();
    expect((await limiter.consume(login, KEY)).allowed).toBe(false);
    expect((await limiter.consume(signUp, KEY)).allowed).toBe(true);
    expect((await limiter.check(login, KEY)).allowed).toBe(false);
  });

  it('never sends or logs the raw IP or email', async () => {
    const bodies: string[] = [];
    failWith(async ({ request }) => {
      bodies.push(await request.text());
      return HttpResponse.json({}, { status: 500 });
    });
    const { limiter, log } = live();
    await limiter.consume(login, KEY);
    const seen = JSON.stringify([bodies, log.mock.calls]);
    expect(bodies.length).toBeGreaterThan(0);
    expect(seen).not.toContain('203.0.113.7');
    expect(seen).not.toContain('ayesha');
    expect(seen).toContain('ma:production:login');
  });
});

it('live mode needs the Upstash URL and token', () => {
  expect(() => createLimiter({ mode: 'live', appEnv: 'production', secret: 's' })).toThrow(
    /UPSTASH_REDIS_REST_URL/,
  );
});
