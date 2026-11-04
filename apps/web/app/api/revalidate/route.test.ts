// @vitest-environment node
import { signRevalidate } from '@mustafa/core/integrations/revalidate';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'r'.repeat(40);
const env = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock('@mustafa/config/env', () => ({ getEnv: () => env.value }));
vi.mock('next/cache', () => ({ revalidateTag }));

import * as route from './route';

const post = (body: string, headers: Record<string, string> = {}) =>
  route.POST(
    new Request('https://mustafaapparels.com/api/revalidate', { method: 'POST', body, headers }),
  );

const signedPost = (tags: unknown, secret = SECRET) => {
  const body = JSON.stringify({ tags });
  const timestamp = String(Math.floor(Date.now() / 1000));
  return post(body, {
    'X-Timestamp': timestamp,
    'X-Signature': signRevalidate(secret, timestamp, body),
  });
};

beforeEach(() => {
  env.value = { REVALIDATE_SECRET: SECRET };
  revalidateTag.mockReset();
});

describe('POST /api/revalidate', () => {
  it('revalidates each signed tag, expiring it at once, and is never cached', async () => {
    const response = await signedPost(['products', 'product:abc']);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: ['products', 'product:abc'] });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(revalidateTag.mock.calls).toEqual([
      ['products', { expire: 0 }],
      ['product:abc', { expire: 0 }],
    ]);
  });

  it('answers 401 to an unsigned call or one signed with another secret', async () => {
    expect((await post(JSON.stringify({ tags: ['products'] }))).status).toBe(401);
    expect((await signedPost(['products'], 'x'.repeat(40))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('answers 400 to a signed call with a tag outside the list', async () => {
    const response = await signedPost(['everything']);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION' } });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('answers 503 when no secret is configured, so it can never run unsigned', async () => {
    env.value = {};
    expect((await signedPost(['products'])).status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('accepts POST only', () => {
    expect(Object.keys(route)).toEqual(['POST']);
  });
});
