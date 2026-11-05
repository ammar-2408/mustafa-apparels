// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assetPrefix,
  cloudinarySignature,
  createMockStore,
  credentials,
  MEDIA_LIMITS,
  type MediaConfig,
  MOCK_CLOUD,
  signUpload,
  verifyUploadSignature,
  VIDEO_EAGER,
} from './media';

const live: MediaConfig = {
  mode: 'live',
  appEnv: 'production',
  cloudName: 'mustafa',
  apiKey: '123456',
  apiSecret: 's3cret',
};
const mock: MediaConfig = { ...live, mode: 'mock', apiSecret: undefined };
const NOW = 1_800_000_000;

describe('cloudinarySignature', () => {
  it("matches Cloudinary's documented example", () => {
    // https://cloudinary.com/documentation/authentication_signatures
    expect(
      cloudinarySignature(
        {
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
          public_id: 'sample_image',
          timestamp: 1315060510,
        },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('does not depend on the order the params were given in', () => {
    expect(cloudinarySignature({ b: 2, a: 1 }, 'x')).toBe(cloudinarySignature({ a: 1, b: 2 }, 'x'));
  });
});

describe('signUpload', () => {
  it('signs a photo into the suit’s own folder, photos formats only', () => {
    const signed = signUpload(live, { kind: 'image', target: 'product', targetId: 'p1', now: NOW });
    expect(signed.uploadUrl).toBe('https://api.cloudinary.com/v1_1/mustafa/image/upload');
    expect(signed.publicId).toMatch(/^products\/p1\/[0-9a-f-]{36}$/);
    expect(signed.fields).toMatchObject({
      public_id: signed.publicId,
      asset_folder: 'products/p1',
      allowed_formats: 'jpg,png,webp',
      timestamp: String(NOW),
      api_key: '123456',
    });
    expect(signed.fields).not.toHaveProperty('eager');
    expect(verifyUploadSignature(signed.fields, 's3cret')).toBe(true);
  });

  it('signs a video with its formats and the silent 720 px delivery version, made in the background', () => {
    const signed = signUpload(live, { kind: 'video', target: 'product', targetId: 'p1', now: NOW });
    expect(signed.uploadUrl).toBe('https://api.cloudinary.com/v1_1/mustafa/video/upload');
    expect(signed.fields).toMatchObject({
      allowed_formats: 'mp4,mov,webm',
      eager: VIDEO_EAGER,
      eager_async: 'true',
    });
    expect(VIDEO_EAGER).toContain('ac_none');
    expect(verifyUploadSignature(signed.fields, 's3cret')).toBe(true);
  });

  it('puts collection images under categories/ and names a poster as one', () => {
    expect(
      signUpload(live, { kind: 'image', target: 'category', targetId: 'c1' }).publicId,
    ).toMatch(/^categories\/c1\//);
    expect(
      signUpload(live, { kind: 'image', target: 'product', targetId: 'p1', purpose: 'poster' })
        .publicId,
    ).toMatch(/^products\/p1\/poster-/);
  });

  it('gives every upload a new public id', () => {
    const a = signUpload(live, { kind: 'image', target: 'product', targetId: 'p1' });
    const b = signUpload(live, { kind: 'image', target: 'product', targetId: 'p1' });
    expect(a.publicId).not.toBe(b.publicId);
  });

  it('never puts the API secret in what goes to the browser', () => {
    const signed = signUpload(live, { kind: 'video', target: 'product', targetId: 'p1' });
    expect(JSON.stringify(signed)).not.toContain('s3cret');
  });

  it('refuses a changed field, as Cloudinary would', () => {
    const signed = signUpload(live, { kind: 'image', target: 'product', targetId: 'p1' });
    expect(
      verifyUploadSignature({ ...signed.fields, public_id: 'products/other/x' }, 's3cret'),
    ).toBe(false);
    expect(
      verifyUploadSignature({ ...signed.fields, allowed_formats: 'jpg,png,webp,gif' }, 's3cret'),
    ).toBe(false);
  });

  it('in mock mode signs with the fixed mock secret and posts to the admin mock route', () => {
    const signed = signUpload(mock, { kind: 'image', target: 'product', targetId: 'p1' });
    expect(signed.uploadUrl).toBe('/api/upload/mock');
    expect(verifyUploadSignature(signed.fields, MOCK_CLOUD.apiSecret)).toBe(true);
  });

  it('fails clearly in live mode without credentials, naming the variables, not values', () => {
    expect(() => credentials({ ...live, apiSecret: undefined })).toThrow(/CLOUDINARY_API_SECRET/);
  });
});

describe('limits', () => {
  it('match docs/api.md §5.2', () => {
    expect(MEDIA_LIMITS.image.maxBytes).toBe(10 * 1024 * 1024);
    expect(MEDIA_LIMITS.video).toMatchObject({ maxBytes: 50 * 1024 * 1024, maxSeconds: 60 });
    expect(assetPrefix('product', 'p1')).toBe('products/p1/');
  });
});

describe('mock store', () => {
  it('saves, reads and removes an asset by public id', () => {
    const store = createMockStore(mkdtempSync(join(tmpdir(), 'media-')));
    const asset = {
      publicId: 'products/p1/abc',
      kind: 'image' as const,
      format: 'jpg',
      bytes: 1000,
      width: 1200,
      height: 1600,
      durationSeconds: null,
      createdAt: NOW,
    };
    expect(store.get(asset.publicId)).toBeNull();
    store.save(asset);
    expect(store.get(asset.publicId)).toEqual(asset);
    store.remove(asset.publicId);
    expect(store.get(asset.publicId)).toBeNull();
  });
});
