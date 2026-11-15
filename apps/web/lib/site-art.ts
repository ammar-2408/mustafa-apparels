import { shapedImageUrl } from '@mustafa/core/media-url';

// The home page's two fabric pictures, cut from the owner's mockups (2026-11-15) and kept on
// Cloudinary under site/home/ (never in public/: bandwidth costs credits). Both show folded
// embroidered fabric, not a suit we sell, so the alt text says what is in the picture.
// Full addresses on purpose: the cloud name is public (it is in every image URL), and a page
// that depended on an env setting showed no picture when the setting was missing.
const UPLOAD = 'https://res.cloudinary.com/zoedbt0j/image/upload/';

export type SiteArt = { src: string; alt: string };

export const SITE_ART = {
  heroFabric: {
    src: shapedImageUrl(`${UPLOAD}site/home/hero-fabric`, 'whole'),
    alt: 'Folded embroidered fabrics in powder blue, cream and rose, with a vase of white flowers',
  },
  aboutStudio: {
    src: shapedImageUrl(`${UPLOAD}site/home/about-studio`, 'whole'),
    alt: 'A tailoring table with a measuring tape, scissors, a pin cushion, an inlaid box and white flowers',
  },
  aboutFabric: {
    src: shapedImageUrl(`${UPLOAD}site/home/about-fabric`, 'whole'),
    alt: 'Embroidered fabrics in powder blue, cream and rose, folded on a marble stand',
  },
} as const satisfies Record<string, SiteArt>;
