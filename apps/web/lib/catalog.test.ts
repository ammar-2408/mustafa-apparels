// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tags = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: (...given: string[]) => tags.list.push(...given),
}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/settings', () => ({ get: vi.fn(async () => ({ whatsapp: '+92300' })) }));
vi.mock('@mustafa/core/categories', () => ({
  list: vi.fn(async () => [{ slug: 'dhanak' }, { slug: 'khaddar' }]),
}));

import { getSiteSettings, listCollections } from './catalog';

beforeEach(() => {
  tags.list = [];
});

describe('cached reads carry the tags the admin sends', () => {
  it('settings', async () => {
    await expect(getSiteSettings()).resolves.toEqual({ whatsapp: '+92300' });
    expect(tags.list).toEqual(['settings']);
  });

  it('collections, with each collection slug', async () => {
    await listCollections();
    expect(tags.list).toEqual(['categories', 'category:dhanak', 'category:khaddar']);
  });
});
