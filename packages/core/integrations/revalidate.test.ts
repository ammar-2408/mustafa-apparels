// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { createRevalidator, signRevalidate, verifyRevalidate } from './revalidate';

const SECRET = 'r'.repeat(40);
const NOW = 1_800_000_000;
const body = JSON.stringify({ tags: ['products', 'product:abc-1'] });

const signed = (overrides: Partial<Parameters<typeof verifyRevalidate>[0]> = {}) => {
  const timestamp = overrides.timestamp ?? String(NOW);
  const text = overrides.body ?? body;
  return verifyRevalidate({
    secret: SECRET,
    timestamp,
    signature: signRevalidate(SECRET, timestamp ?? '', text),
    body: text,
    now: NOW,
    ...overrides,
  });
};

describe('verifyRevalidate', () => {
  it('accepts a fresh, correctly signed body and returns its tags once each', () => {
    const twice = JSON.stringify({ tags: ['products', 'products', 'settings'] });
    expect(signed()).toEqual({ ok: true, tags: ['products', 'product:abc-1'] });
    expect(signed({ body: twice })).toEqual({ ok: true, tags: ['products', 'settings'] });
  });

  it('accepts up to five minutes of clock difference either way', () => {
    expect(signed({ timestamp: String(NOW - 300) }).ok).toBe(true);
    expect(signed({ timestamp: String(NOW + 300) }).ok).toBe(true);
  });

  it.each([
    ['older than five minutes', String(NOW - 301)],
    ['more than five minutes ahead', String(NOW + 301)],
    ['not a number', 'yesterday'],
    ['in milliseconds', String(NOW * 1000)],
  ])('refuses a timestamp %s with 401', (_name, timestamp) => {
    expect(signed({ timestamp })).toMatchObject({ ok: false, status: 401 });
  });

  it('refuses a missing timestamp or signature with 401', () => {
    expect(signed({ timestamp: null })).toMatchObject({ ok: false, status: 401 });
    expect(signed({ signature: null })).toMatchObject({ ok: false, status: 401 });
  });

  it('refuses a signature made with another secret, or of another body', () => {
    const t = String(NOW);
    expect(signed({ signature: signRevalidate('x'.repeat(40), t, body) })).toMatchObject({
      status: 401,
    });
    const tampered = JSON.stringify({ tags: ['settings'] });
    expect(
      verifyRevalidate({
        secret: SECRET,
        timestamp: t,
        signature: signRevalidate(SECRET, t, body),
        body: tampered,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, status: 401, reason: 'bad signature' });
  });

  it('refuses a signature of the wrong length or not hex', () => {
    expect(signed({ signature: 'abc' })).toMatchObject({ status: 401 });
    expect(signed({ signature: 'z'.repeat(64) })).toMatchObject({ status: 401 });
  });

  it('refuses a body over 2 KB with 400, before checking anything else', () => {
    const big = JSON.stringify({ tags: ['products'], pad: 'x'.repeat(2100) });
    expect(signed({ body: big })).toMatchObject({ ok: false, status: 400 });
    expect(signed({ body: big, signature: null })).toMatchObject({ status: 400 });
  });

  it('refuses a signed body that is not JSON or has a tag outside the list, with 400', () => {
    expect(signed({ body: 'not json' })).toMatchObject({ status: 400, reason: 'bad body' });
    expect(signed({ body: JSON.stringify({ tags: ['everything'] }) })).toMatchObject({
      status: 400,
      reason: 'bad tags',
    });
  });
});

describe('createRevalidator', () => {
  const live = (fetchImpl: typeof fetch, log = vi.fn()) => ({
    log,
    revalidate: createRevalidator({
      mode: 'live',
      webUrl: 'https://mustafaapparels.com',
      secret: SECRET,
      fetchImpl,
      log,
      now: () => NOW,
    }),
  });

  it('posts the tags once each, signed so the storefront accepts them', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    await live(fetchImpl as never).revalidate(['products', 'products', 'category:dhanak']);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe('https://mustafaapparels.com/api/revalidate');
    const headers = init.headers as Record<string, string>;
    expect(
      verifyRevalidate({
        secret: SECRET,
        timestamp: headers['X-Timestamp'] ?? null,
        signature: headers['X-Signature'] ?? null,
        body: String(init.body),
        now: NOW,
      }),
    ).toEqual({ ok: true, tags: ['products', 'category:dhanak'] });
  });

  it('never throws: a network failure or an error answer is only logged, without the secret', async () => {
    const down = live(vi.fn(async () => Promise.reject(new TypeError('fetch failed'))) as never);
    await expect(down.revalidate(['products'])).resolves.toBeUndefined();
    expect(down.log).toHaveBeenCalledWith('[revalidate] call failed (TypeError)');

    const refused = live(vi.fn(async () => new Response('', { status: 401 })) as never);
    await refused.revalidate(['products']);
    expect(refused.log).toHaveBeenCalledWith('[revalidate] storefront answered 401');
    expect(JSON.stringify(refused.log.mock.calls)).not.toContain(SECRET);
  });

  it('skips the call in mock mode, without config, or with no tags', async () => {
    const fetchImpl = vi.fn();
    const log = vi.fn();
    const base = { webUrl: 'https://x.test', secret: SECRET, fetchImpl, log } as const;
    await createRevalidator({ ...base, mode: 'mock' })(['products']);
    await createRevalidator({ ...base, mode: 'live', secret: undefined })(['products']);
    await createRevalidator({ ...base, mode: 'live' })([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(2);
  });
});
