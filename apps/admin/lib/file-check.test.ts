import { imageThumbUrl, videoDeliveryUrl, videoPosterUrl } from '@mustafa/core/media-url';
import { describe, expect, it } from 'vitest';

import { checkDuration, checkFile, kindOf } from './file-check';

const MB = 1024 * 1024;
const file = (name: string, type: string, size = MB) => ({ name, type, size });

describe('checkFile', () => {
  it.each([
    ['front.jpg', 'image/jpeg', 'image'],
    ['front.png', 'image/png', 'image'],
    ['front.webp', 'image/webp', 'image'],
    ['walk.mp4', 'video/mp4', 'video'],
    ['walk.mov', 'video/quicktime', 'video'],
    ['walk.webm', 'video/webm', 'video'],
  ])('accepts %s', (name, type, kind) => {
    expect(checkFile(file(name, type))).toEqual({ ok: true, kind });
  });

  it('refuses other types, by name', () => {
    expect(checkFile(file('logo.gif', 'image/gif'))).toEqual({
      ok: false,
      error: expect.stringMatching(/^logo\.gif can't be used/),
    });
    expect(kindOf({ type: 'application/pdf' })).toBeNull();
  });

  it('allows up to 10 MB for a photo and 50 MB for a video, and says the size', () => {
    expect(checkFile(file('a.jpg', 'image/jpeg', 10 * MB)).ok).toBe(true);
    expect(checkFile(file('a.jpg', 'image/jpeg', 10 * MB + 1))).toEqual({
      ok: false,
      error: 'a.jpg is 10.0 MB. Photos can be up to 10 MB.',
    });
    expect(checkFile(file('v.mp4', 'video/mp4', 50 * MB)).ok).toBe(true);
    expect(checkFile(file('v.mp4', 'video/mp4', 51 * MB))).toMatchObject({
      error: 'v.mp4 is 51.0 MB. Videos can be up to 50 MB.',
    });
  });

  it('refuses a video where only a photo will do', () => {
    expect(checkFile(file('v.mp4', 'video/mp4'), ['image'])).toMatchObject({
      ok: false,
      error: expect.stringContaining('Choose a JPEG, PNG or WebP photo.'),
    });
  });
});

describe('checkDuration', () => {
  it('allows 60 seconds and refuses more', () => {
    expect(checkDuration('v.mp4', 60)).toBeNull();
    expect(checkDuration('v.mp4', 61.2)).toBe(
      'v.mp4 is 61 seconds long. Videos can be up to 60 seconds.',
    );
    expect(checkDuration('v.mp4', Number.NaN)).toBeNull();
  });
});

describe('Cloudinary URLs', () => {
  it('builds a top-cropped 3:4 thumbnail', () => {
    expect(imageThumbUrl('mustafa', 'products/p1/a')).toBe(
      'https://res.cloudinary.com/mustafa/image/upload/f_auto,q_auto,c_fill,g_north,ar_3:4,w_320/products/p1/a',
    );
  });

  it('plays the silent 720 px version and shows the first frame or the chosen poster', () => {
    expect(videoDeliveryUrl('mustafa', 'products/p1/v')).toBe(
      'https://res.cloudinary.com/mustafa/video/upload/ac_none,c_limit,w_720,q_auto,vc_h264/products/p1/v.mp4',
    );
    expect(videoPosterUrl('mustafa', 'products/p1/v', null)).toBe(
      'https://res.cloudinary.com/mustafa/video/upload/so_0,f_auto,q_auto,c_limit,w_720/products/p1/v.jpg',
    );
    expect(videoPosterUrl('mustafa', 'products/p1/v', 'products/p1/poster-1')).toBe(
      'https://res.cloudinary.com/mustafa/image/upload/f_auto,q_auto,c_limit,w_720/products/p1/poster-1',
    );
  });
});
