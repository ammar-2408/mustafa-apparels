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
  pageAbout: {
    src: shapedImageUrl(`${UPLOAD}site/pages/about`, 'whole'),
    alt: 'Cream fabric with red and gold floral embroidery',
  },
  pageContact: {
    src: shapedImageUrl(`${UPLOAD}site/pages/contact`, 'whole'),
    alt: 'Folded green fabric with gold embroidery beside a vase of white flowers',
  },
  pageFaq: {
    src: shapedImageUrl(`${UPLOAD}site/pages/faq`, 'whole'),
    alt: 'Draped cream fabric with gold and green floral embroidery',
  },
  pageOrder: {
    src: shapedImageUrl(`${UPLOAD}site/pages/order`, 'whole'),
    alt: 'Stacked green, cream and maroon fabrics with gold embroidery',
  },
  collectionFabric: {
    src: shapedImageUrl(`${UPLOAD}site/collections/fabric`, 'whole'),
    alt: 'Draped cream fabric with fine floral embroidery',
  },
  aboutStudio: {
    src: shapedImageUrl(`${UPLOAD}site/home/about-studio`, 'whole'),
    alt: 'A tailoring table with a measuring tape, scissors, a pin cushion, an inlaid box and white flowers',
  },
  // The owner's Boutique Showcase mockup (2026-11-17).
  aboutBoutique: {
    src: shapedImageUrl(`${UPLOAD}site/home/about-boutique`, 'whole'),
    alt: 'A maroon suit with gold embroidery and a sheer dupatta on a dress form, beside folded embroidered fabrics and rails of suits',
  },
  aboutLeaves: {
    src: shapedImageUrl(`${UPLOAD}site/home/about-leaves`, 'whole'),
    alt: '',
  },
  aboutFabric: {
    src: shapedImageUrl(`${UPLOAD}site/home/about-fabric`, 'whole'),
    alt: 'Embroidered fabrics in powder blue, cream and rose, folded on a marble stand',
  },
} as const satisfies Record<string, SiteArt>;
