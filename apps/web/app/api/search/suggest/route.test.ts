// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const allowed = vi.hoisted(() => ({ value: true }));
const suggest = vi.hoisted(() =>
  vi.fn(async () => ({ collections: [{ name: 'Khaddar', slug: 'khaddar' }], products: [] })),
);
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/search', () => ({ suggest }));
vi.mock('../../../../lib/services', () => ({ withinLimit: async () => allowed.value }));

import { GET } from './route';

const get = (q: string) =>
  GET(new NextRequest(`http://localhost/api/search/suggest?q=${encodeURIComponent(q)}`));

beforeEach(() => {
  allowed.value = true;
  suggest.mockClear();
});

describe('GET /api/search/suggest', () => {
  it('suggests for 2 to 60 characters, with a short shared cache', async () => {
    const response = await get('  khadar ');
    expect(await response.json()).toEqual({
      collections: [{ name: 'Khaddar', slug: 'khaddar' }],
      products: [],
    });
    expect(suggest).toHaveBeenCalledWith('db', { q: 'khadar' });
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=60');
  });

  it('answers nothing for too short or too long a query, without searching', async () => {
    for (const q of ['k', 'x'.repeat(61)]) {
      expect(await (await get(q)).json()).toEqual({ collections: [], products: [] });
    }
    expect(suggest).not.toHaveBeenCalled();
  });

  it('refuses with 429 when over the limit', async () => {
    allowed.value = false;
    const response = await get('dhanak');
    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(suggest).not.toHaveBeenCalled();
  });
});
