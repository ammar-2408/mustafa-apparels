// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tags = vi.hoisted(() => ({ list: [] as string[], keys: [] as string[][] }));
const env = vi.hoisted(() => ({ DATABASE_URL: undefined as string | undefined }));
vi.mock('@mustafa/config/env', () => ({ getEnv: () => env }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  unstable_cache:
    (read: () => Promise<unknown>, key: string[], options: { tags: string[] }) => () => {
      tags.keys.push(key);
      tags.list.push(...options.tags);
      return read();
    },
}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/settings', () => ({ get: vi.fn(async () => ({ whatsapp: '+92300' })) }));
vi.mock('@mustafa/core/categories', () => ({
  list: vi.fn(async () => [{ slug: 'dhanak', name: 'Dhanak' }]),
  getBySlug: vi.fn(async () => null),
  resolveRedirect: vi.fn(async () => 'dhanak'),
}));
vi.mock('@mustafa/core/products', () => ({
  list: vi.fn(async () => {
    throw new (class extends Error {
      code = 'NOT_FOUND';
    })();
  }),
}));

import {
  collectionRedirect,
  getCollection,
  getSiteSettings,
  listCollections,
  listSuits,
} from './catalog';

beforeEach(() => {
  tags.list = [];
  tags.keys = [];
});

it('keys each entry by the database it read, without the password', async () => {
  env.DATABASE_URL = 'postgresql://u:secret@ep-dev-1.neon.tech/neondb';
  await getSiteSettings();
  env.DATABASE_URL = 'postgresql://u:secret@ep-e2e-2.neon.tech/neondb';
  await getSiteSettings();
  expect(tags.keys.map((k) => k[1])).toEqual([
    'ep-dev-1.neon.tech/neondb',
    'ep-e2e-2.neon.tech/neondb',
  ]);
  expect(JSON.stringify(tags.keys)).not.toContain('secret');
});

describe('cached reads carry the tags the admin sends', () => {
  it('settings', async () => {
    await expect(getSiteSettings()).resolves.toEqual({ whatsapp: '+92300' });
    expect(tags.list).toEqual(['settings']);
  });

  it('collections', async () => {
    await listCollections();
    await collectionRedirect('old');
    expect(tags.list).toEqual(['categories', 'categories']);
  });

  it('one collection, with its slug', async () => {
    await expect(getCollection('dhanak')).resolves.toBeNull();
    expect(tags.list).toEqual(['categories', 'category:dhanak']);
  });

  it('a list of suits: every suit and collection change, and its own collection', async () => {
    await expect(listSuits({ categorySlug: 'gone', page: 1 })).rejects.toThrow();
    expect(tags.list).toEqual(['products', 'categories', 'category:gone']);
  });
});
