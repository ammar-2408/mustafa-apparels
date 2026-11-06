// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/catalog', () => ({
  REVALIDATE_SECONDS: 3600,
  listForFilters: vi.fn(async () => [{ id: 's1', slug: 'black-suit' }]),
}));

import { dynamic, GET, revalidate } from './route';

describe('GET /api/suits', () => {
  it('sends every published suit from the cached read, as a static, cacheable response', async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ suits: [{ id: 's1', slug: 'black-suit' }] });
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(dynamic).toBe('force-static');
    expect(revalidate).toBe(3600);
  });
});
