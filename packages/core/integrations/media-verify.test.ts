// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type AssetInfo,
  assetProblems,
  AssetRejected,
  assetUrl,
  createMockStore,
  deleteAsset,
  getAsset,
  type MediaConfig,
  verifyAsset,
} from './media';

const MB = 1024 * 1024;
const NOW = 1_800_000_000;
const live: MediaConfig = {
  mode: 'live',
  appEnv: 'production',
  cloudName: 'mustafa',
  apiKey: '123456',
  apiSecret: 's3cret',
};
const mockConfig: MediaConfig = { ...live, mode: 'mock' };

const photo = (overrides: Partial<AssetInfo> = {}): AssetInfo => ({
  publicId: 'products/p1/abc',
  kind: 'image',
  format: 'jpg',
  bytes: 2 * MB,
  width: 1200,
  height: 1600,
  durationSeconds: null,
  createdAt: NOW - 60,
  ...overrides,
});
const video = (overrides: Partial<AssetInfo> = {}) =>
  photo({ kind: 'video', format: 'mp4', bytes: 20 * MB, durationSeconds: 30, ...overrides });

const expectPhoto = { kind: 'image' as const, prefix: 'products/p1/', now: NOW };
const expectVideo = { kind: 'video' as const, prefix: 'products/p1/', now: NOW };

describe('assetProblems', () => {
  it('passes a photo and a video inside every limit, at the limits too', () => {
    expect(assetProblems(photo(), expectPhoto)).toEqual([]);
    expect(assetProblems(photo({ bytes: 10 * MB }), expectPhoto)).toEqual([]);
    expect(assetProblems(video({ bytes: 50 * MB, durationSeconds: 60 }), expectVideo)).toEqual([]);
    for (const format of ['png', 'webp']) {
      expect(assetProblems(photo({ format }), expectPhoto)).toEqual([]);
    }
    for (const format of ['mov', 'webm']) {
      expect(assetProblems(video({ format }), expectVideo)).toEqual([]);
    }
  });

  it.each([
    ['a photo over 10 MB', photo({ bytes: 10 * MB + 1 }), expectPhoto, /over 10 MB/],
    ['a GIF', photo({ format: 'gif' }), expectPhoto, /GIF files can.t be used/],
    ['a video over 50 MB', video({ bytes: 50 * MB + 1 }), expectVideo, /over 50 MB/],
    ['a video over 60 s', video({ durationSeconds: 60.5 }), expectVideo, /longer than 60 seconds/],
    ['a video with no length', video({ durationSeconds: null }), expectVideo, /longer than 60/],
    ['an AVI', video({ format: 'avi' }), expectVideo, /AVI files/],
    ['another suit’s file', photo({ publicId: 'products/p2/abc' }), expectPhoto, /something else/],
    ['a path trick', photo({ publicId: 'products/p1/../p2/x' }), expectPhoto, /something else/],
    ['an upload over an hour old', photo({ createdAt: NOW - 3601 }), expectPhoto, /an hour old/],
    ['a video sent as a photo', video(), expectPhoto, /not a photo/],
  ])('refuses %s', (_name, asset, expected, message) => {
    expect(assetProblems(asset, expected).join(' ')).toMatch(message);
  });

  it('lists every problem at once', () => {
    expect(assetProblems(photo({ bytes: 11 * MB, format: 'gif' }), expectPhoto)).toHaveLength(2);
  });
});

describe('getAsset and deleteAsset against Cloudinary', () => {
  it('reads an asset with basic auth and keeps only Cloudinary’s figures', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        public_id: 'products/p1/v',
        resource_type: 'video',
        format: 'mp4',
        bytes: 1234,
        width: 720,
        height: 1280,
        duration: 21.4,
        created_at: '2027-01-15T08:00:00Z',
      }),
    );
    const asset = await getAsset(live, 'products/p1/v', 'video', { fetchImpl: fetchImpl as never });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://api.cloudinary.com/v1_1/mustafa/resources/video/upload/products/p1/v',
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('123456:s3cret').toString('base64')}`,
    );
    expect(asset).toEqual({
      publicId: 'products/p1/v',
      kind: 'video',
      format: 'mp4',
      bytes: 1234,
      width: 720,
      height: 1280,
      durationSeconds: 21.4,
      createdAt: Date.parse('2027-01-15T08:00:00Z') / 1000,
    });
  });

  it('answers null for an asset Cloudinary does not have, and throws on other errors', async () => {
    const missing = vi.fn(async () => new Response('', { status: 404 }));
    expect(
      await getAsset(live, 'products/p1/x', 'image', { fetchImpl: missing as never }),
    ).toBeNull();
    const down = vi.fn(async () => new Response('', { status: 500 }));
    await expect(
      getAsset(live, 'products/p1/x', 'image', { fetchImpl: down as never }),
    ).rejects.toThrow('500');
  });

  it('deletes with a signed destroy call and invalidates cached copies', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ result: 'ok' }));
    expect(
      await deleteAsset(live, 'products/p1/x', 'image', { fetchImpl: fetchImpl as never }),
    ).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/mustafa/image/destroy');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('public_id')).toBe('products/p1/x');
    expect(body.get('invalidate')).toBe('true');
    expect(body.get('signature')).toMatch(/^[0-9a-f]{40}$/);
    expect(String(init.body)).not.toContain('s3cret');
  });

  it('treats "not found" as deleted and an error answer as not deleted', async () => {
    const gone = vi.fn(async () => Response.json({ result: 'not found' }));
    expect(await deleteAsset(live, 'products/p1/x', 'image', { fetchImpl: gone as never })).toBe(
      true,
    );
    const down = vi.fn(async () => new Response('', { status: 500 }));
    expect(await deleteAsset(live, 'products/p1/x', 'image', { fetchImpl: down as never })).toBe(
      false,
    );
  });
});

describe('verifyAsset (mock store)', () => {
  let storeDir: string;
  beforeEach(() => {
    storeDir = mkdtempSync(join(tmpdir(), 'verify-'));
  });

  it('returns Cloudinary’s figures for a good upload and keeps it', async () => {
    createMockStore(storeDir).save(photo());
    expect(await verifyAsset(mockConfig, 'products/p1/abc', expectPhoto, { storeDir })).toEqual(
      photo(),
    );
    expect(createMockStore(storeDir).get('products/p1/abc')).not.toBeNull();
  });

  it('refuses and deletes an upload for this suit that breaks a limit', async () => {
    createMockStore(storeDir).save(video({ durationSeconds: 75 }));
    const error = await verifyAsset(mockConfig, 'products/p1/abc', expectVideo, {
      storeDir,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AssetRejected);
    expect((error as AssetRejected).problems.join(' ')).toMatch(/longer than 60/);
    expect(createMockStore(storeDir).get('products/p1/abc')).toBeNull();
  });

  it('refuses another suit’s file but never deletes it', async () => {
    createMockStore(storeDir).save(photo({ publicId: 'products/p2/abc' }));
    await expect(
      verifyAsset(mockConfig, 'products/p2/abc', expectPhoto, { storeDir }),
    ).rejects.toBeInstanceOf(AssetRejected);
    expect(createMockStore(storeDir).get('products/p2/abc')).not.toBeNull();
  });

  it('refuses an upload that does not exist', async () => {
    await expect(
      verifyAsset(mockConfig, 'products/p1/none', expectPhoto, { storeDir }),
    ).rejects.toThrow(AssetRejected);
  });
});

it('builds the stored URL of the original from the cloud name', () => {
  expect(assetUrl(live, photo())).toBe(
    'https://res.cloudinary.com/mustafa/image/upload/products/p1/abc.jpg',
  );
});
