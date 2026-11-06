'use client';
// The storefront's next/image loader (next.config `images.loaderFile`): Cloudinary makes each
// srcset width as WebP or AVIF, so Netlify never processes or serves the photos (ADR-011).
import { imageAtWidth } from '@mustafa/core/media-url';

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  return imageAtWidth(src, width, quality);
}
