import { describe, expect, it } from 'vitest';

import {
  mediaAddInput,
  mediaAltInput,
  mediaDeleteInput,
  mediaInput,
  mediaListInput,
  mediaPosterInput,
  mediaPrimaryInput,
  mediaReorderInput,
  uploadSignInput,
} from './media';

const photo = {
  kind: 'image',
  publicId: 'products/imported/DHN-01/dhnk1',
  url: 'https://res.cloudinary.com/mustafa/image/upload/products/imported/DHN-01/dhnk1.jpg',
  alt: 'Model wearing a black 3-piece Dhanak suit',
  posterPublicId: null,
  sortOrder: 0,
  isPrimary: true,
};

const video = {
  ...photo,
  kind: 'video',
  publicId: 'products/imported/DHN-02/dhnk2-VID',
  url: 'https://res.cloudinary.com/mustafa/video/upload/products/imported/DHN-02/dhnk2-VID.mp4',
  isPrimary: false,
  sortOrder: 1,
};

describe('mediaInput', () => {
  it('accepts a main photo and a video', () => {
    expect(mediaInput.safeParse(photo).success).toBe(true);
    expect(mediaInput.safeParse(video).success).toBe(true);
  });

  it('refuses a video as the main item', () => {
    const result = mediaInput.safeParse({ ...video, isPrimary: true });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['isPrimary'],
      message: 'The main item must be a photo',
    });
  });

  it.each([
    ['an asset outside the products folder', { publicId: 'other/dhnk1' }],
    ['a poster outside the products folder', { posterPublicId: 'other/poster' }],
    ['alt text under 3 characters', { alt: 'ab' }],
    ['a banned brand name in the alt text', { alt: 'Khaadi model in black' }],
    ['a URL that is not https', { url: 'http://res.cloudinary.com/x.jpg' }],
    ['a URL on another host', { url: 'https://evil.example.com/products/x.jpg' }],
    ['a negative sort order', { sortOrder: -1 }],
    ['width sent by the browser', { width: 1200 }],
    ['an unknown kind', { kind: 'audio' }],
  ])('rejects %s', (_, change) => {
    expect(mediaInput.safeParse({ ...photo, ...change }).success).toBe(false);
  });
});

describe('mediaListInput', () => {
  it('accepts at most one main photo', () => {
    expect(mediaListInput.safeParse([photo, video]).success).toBe(true);
    const second = { ...photo, publicId: 'products/x/2', isPrimary: true };
    expect(mediaListInput.safeParse([photo, second]).error?.issues[0]?.message).toBe(
      'Choose one main photo',
    );
  });

  it('rejects the same asset twice', () => {
    expect(mediaListInput.safeParse([photo, { ...photo, isPrimary: false }]).success).toBe(false);
  });
});

describe('uploadSignInput', () => {
  const ok = (input: unknown) => uploadSignInput.safeParse(input).success;

  it('takes a kind, a target and its id', () => {
    expect(ok({ kind: 'image', target: 'product', targetId: 'p1' })).toBe(true);
    expect(ok({ kind: 'video', target: 'product', targetId: 'p1' })).toBe(true);
    expect(ok({ kind: 'image', target: 'category', targetId: 'c-1' })).toBe(true);
    expect(ok({ kind: 'image', target: 'product', targetId: 'p1', purpose: 'poster' })).toBe(true);
  });

  it.each([
    ['an unknown kind', { kind: 'raw', target: 'product', targetId: 'p1' }],
    ['an unknown target', { kind: 'image', target: 'user', targetId: 'p1' }],
    ['a path in the id', { kind: 'image', target: 'product', targetId: '../x' }],
    [
      'a folder from the browser',
      { kind: 'image', target: 'product', targetId: 'p1', folder: 'x' },
    ],
    ['a video poster', { kind: 'video', target: 'product', targetId: 'p1', purpose: 'poster' }],
    ['no id', { kind: 'image', target: 'product' }],
  ])('refuses %s', (_name, input) => {
    expect(ok(input)).toBe(false);
  });
});

describe('media action inputs', () => {
  it('accepts only public ids the server could have signed', () => {
    const ok = (publicId: string) =>
      mediaAddInput.safeParse({
        productId: 'p1',
        kind: 'image',
        publicId,
        alt: 'Black suit, front',
      }).success;
    expect(ok('products/p1/0193c1a2-7b1e-7cc0-9d2a-4c1f0e8b9a11')).toBe(true);
    expect(ok('categories/c1/abc')).toBe(true);
    for (const bad of [
      'products/p1',
      'products/p1/../x',
      'other/p1/x',
      'products/p1/a/b',
      'products/p1/a.jpg',
    ]) {
      expect(ok(bad), bad).toBe(false);
    }
  });

  it('needs alt text of 3–200 characters with no brand name', () => {
    const ok = (alt: string) => mediaAltInput.safeParse({ mediaId: 'm1', alt }).success;
    expect(ok('Black suit, front')).toBe(true);
    expect(ok('  ab ')).toBe(false);
    expect(ok('x'.repeat(201))).toBe(false);
    expect(ok('Elaf style black suit')).toBe(false);
  });

  it('lists each item once when reordering, and takes a null poster', () => {
    expect(mediaReorderInput.safeParse({ productId: 'p1', mediaIds: ['a', 'a'] }).success).toBe(
      false,
    );
    expect(mediaPosterInput.safeParse({ mediaId: 'm1', posterPublicId: null }).success).toBe(true);
    expect(mediaDeleteInput.safeParse({ mediaId: 'm1', productId: 'p1' }).success).toBe(false);
    expect(mediaPrimaryInput.safeParse({ productId: 'p1', mediaId: 'm1' }).success).toBe(true);
  });
});
