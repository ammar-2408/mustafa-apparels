import { createHash } from 'node:crypto';

import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createBreachCheck, MOCK_BREACHED } from './breached-passwords';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PASSWORD = 'correct horse battery staple';
const hash = createHash('sha1').update(PASSWORD).digest('hex').toUpperCase();

const live = (log = vi.fn()) => ({
  check: createBreachCheck({ mode: 'live', timeoutMs: 100, log }),
  log,
});

const range = (lines: string[]) =>
  http.get('https://api.pwnedpasswords.com/range/:prefix', ({ params, request }) => {
    expect(params.prefix).toBe(hash.slice(0, 5));
    expect(request.headers.get('add-padding')).toBe('true');
    return HttpResponse.text(lines.join('\r\n'));
  });

describe('live mode', () => {
  it('sends only the first 5 characters of the hash, and finds a breached password', async () => {
    server.use(range(['0018A45C4D1DEF81644B54AB7F969B88D65:1', `${hash.slice(5)}:24`]));
    expect(await live().check(PASSWORD)).toBe(true);
  });

  it('allows a password that is not in the list, or only in the padding', async () => {
    server.use(range(['0018A45C4D1DEF81644B54AB7F969B88D65:3', `${hash.slice(5)}:0`]));
    expect(await live().check(PASSWORD)).toBe(false);
  });

  it.each([
    ['an error answer', () => HttpResponse.text('', { status: 503 })],
    ['a network failure', () => HttpResponse.error()],
    [
      'a slow answer',
      async () => {
        await delay(1000);
        return HttpResponse.text('');
      },
    ],
  ])('allows the password and logs it on %s', async (_name, response) => {
    server.use(http.get('https://api.pwnedpasswords.com/range/:prefix', response));
    const { check, log } = live();
    expect(await check(PASSWORD)).toBe(false);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[breached-passwords\] check skipped/),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(PASSWORD);
  });
});

describe('mock mode', () => {
  it('refuses only the few known test passwords, with no network', async () => {
    const check = createBreachCheck({ mode: 'mock' });
    for (const password of MOCK_BREACHED) expect(await check(password)).toBe(true);
    expect(await check(PASSWORD)).toBe(false);
  });
});
