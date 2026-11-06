import { describe, expect, it } from 'vitest';

import {
  imageAtWidth,
  imageThumbUrl,
  isCloudinaryImage,
  shapedImageUrl,
  videoDeliveryUrl,
  videoPosterUrl,
} from './media-url';

const PHOTO =
  'https://res.cloudinary.com/ma/image/upload/products/imported/DHN-01/dhn-01-ab12cd34.jpg';

describe('admin previews', () => {
  it('builds the thumbnail, the silent video and both poster kinds', () => {
    expect(imageThumbUrl('ma', 'products/x')).toBe(
      'https://res.cloudinary.com/ma/image/upload/f_auto,q_auto,c_fill,g_north,ar_3:4,w_320/products/x',
    );
    expect(videoDeliveryUrl('ma', 'products/v')).toContain('/video/upload/ac_none,');
    expect(videoPosterUrl('ma', 'products/v', 'products/p', 480)).toBe(
      'https://res.cloudinary.com/ma/image/upload/f_auto,q_auto,c_limit,w_480/products/p',
    );
    expect(videoPosterUrl('ma', 'products/v', null)).toBe(
      'https://res.cloudinary.com/ma/video/upload/so_0,f_auto,q_auto,c_limit,w_720/products/v.jpg',
    );
  });
});

describe('storefront images', () => {
  it('crops a card from the top at 3:4, at each width the browser asks for', () => {
    const card = shapedImageUrl(PHOTO, 'card');
    expect(card).toBe(
      'https://res.cloudinary.com/ma/image/upload/c_fill,g_north,ar_3:4/products/imported/DHN-01/dhn-01-ab12cd34.jpg',
    );
    expect(imageAtWidth(card, 384)).toBe(
      'https://res.cloudinary.com/ma/image/upload/c_fill,g_north,ar_3:4,w_384,f_auto,q_auto/products/imported/DHN-01/dhn-01-ab12cd34.jpg',
    );
  });

  it('shows a gallery photo whole, and an unshaped one whole too', () => {
    expect(imageAtWidth(shapedImageUrl(PHOTO, 'whole'), 828, 80)).toBe(
      'https://res.cloudinary.com/ma/image/upload/c_limit,w_828,f_auto,q_80/products/imported/DHN-01/dhn-01-ab12cd34.jpg',
    );
    expect(imageAtWidth(PHOTO, 640)).toContain(
      '/image/upload/c_limit,w_640,f_auto,q_auto/products/',
    );
  });

  it('replaces a shape rather than stacking two', () => {
    const twice = shapedImageUrl(shapedImageUrl(PHOTO, 'card'), 'whole');
    expect(twice).toBe(shapedImageUrl(PHOTO, 'whole'));
  });

  it('leaves URLs that are not Cloudinary photos alone', () => {
    const local = '/brand/svg/mustafa-apparels-submark-black.svg';
    expect(isCloudinaryImage(local)).toBe(false);
    expect(shapedImageUrl(local, 'card')).toBe(local);
    expect(imageAtWidth(local, 640)).toBe(local);
    const video = 'https://res.cloudinary.com/ma/video/upload/products/v.mp4';
    expect(imageAtWidth(video, 640)).toBe(video);
  });
});
