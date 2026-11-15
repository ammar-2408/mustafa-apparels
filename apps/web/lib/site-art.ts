import { shapedImageUrl } from '@mustafa/core/media-url';

// The home page's two fabric pictures, cut from the owner's mockups (2026-11-15) and kept on
// Cloudinary under site/home/ (never in public/: bandwidth costs credits). Both show folded
// embroidered fabric, not a suit we sell, so the alt text says what is in the picture.
export const SITE_ART = {
  heroFabric: {
    publicId: 'site/home/hero-fabric',
    alt: 'Folded embroidered fabrics in powder blue, cream and rose, with a vase of white flowers',
  },
  aboutFabric: {
    publicId: 'site/home/about-fabric',
    alt: 'Embroidered fabrics in powder blue, cream and rose, folded on a marble stand',
  },
} as const;

export type SiteArt = { src: string; alt: string };

// The picture's address through our Cloudinary loader, or null when no cloud is set (mock mode).
export function siteArt(
  art: (typeof SITE_ART)[keyof typeof SITE_ART],
  cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
): SiteArt | null {
  if (!cloudName) return null;
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${art.publicId}`;
  return { src: shapedImageUrl(url, 'whole'), alt: art.alt };
}
