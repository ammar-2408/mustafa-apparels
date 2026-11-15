// Cloudinary delivery URLs for both apps (docs/integrations.md). Pure string work, safe in the
// browser: the admin's previews and the storefront's next/image loader share it.
const BASE = (cloudName: string) => `https://res.cloudinary.com/${cloudName}`;

// A 3:4 thumbnail cropped from the top, like the storefront's grid cards.
export const imageThumbUrl = (cloudName: string, publicId: string, width = 320) =>
  `${BASE(cloudName)}/image/upload/f_auto,q_auto,c_fill,g_north,ar_3:4,w_${width}/${publicId}`;

// The silent 720 px H.264 version made at upload (VIDEO_EAGER).
export const videoDeliveryUrl = (cloudName: string, publicId: string) =>
  `${BASE(cloudName)}/video/upload/ac_none,c_limit,w_720,q_auto,vc_h264/${publicId}.mp4`;

// The owner's chosen poster photo, or the video's first frame.
export const videoPosterUrl = (
  cloudName: string,
  publicId: string,
  posterPublicId: string | null,
  width = 720,
) =>
  posterPublicId
    ? `${BASE(cloudName)}/image/upload/f_auto,q_auto,c_limit,w_${width}/${posterPublicId}`
    : `${BASE(cloudName)}/video/upload/so_0,f_auto,q_auto,c_limit,w_${width}/${publicId}.jpg`;

// --- Storefront images ---------------------------------------------------------------------
// A stored photo URL is `https://res.cloudinary.com/<cloud>/image/upload/<public id>.<ext>`.
// The page picks the shape (a marker segment); the loader adds the width for each srcset entry.

const UPLOAD = '/image/upload/';

/** The shapes the storefront shows a photo in. */
export const IMAGE_SHAPES = {
  // Grid cards: fill a 3:4 box from the top, since stock photos are taller (docs/design.md §2).
  card: 'c_fill,g_north,ar_3:4',
  // The gallery: the whole photo, never cropped.
  whole: 'c_limit',
  // The home hero's arch: 4:5 from the top, so the face and shirt stay in.
  hero: 'c_fill,g_north,ar_4:5',
  // Shop by Fabric cards: a square from the middle of the photo, where the embroidery is.
  detail: 'c_fill,g_center,ar_1:1',
} as const;
export type ImageShape = keyof typeof IMAGE_SHAPES;

const SHAPE_VALUES = new Set<string>(Object.values(IMAGE_SHAPES));

export const isCloudinaryImage = (url: string) =>
  url.startsWith('https://res.cloudinary.com/') && url.includes(UPLOAD);

/** Marks a stored photo URL with the shape to show it in. Other URLs are left alone. */
export function shapedImageUrl(url: string, shape: ImageShape) {
  if (!isCloudinaryImage(url)) return url;
  const [head, tail] = splitOnce(url, UPLOAD);
  const rest = SHAPE_VALUES.has(firstSegment(tail)) ? tail.slice(tail.indexOf('/') + 1) : tail;
  return `${head}${UPLOAD}${IMAGE_SHAPES[shape]}/${rest}`;
}

/**
 * The next/image loader's work: one width of a (shaped) photo, as WebP or AVIF where the browser
 * takes it. A photo with no shape is shown whole.
 */
export function imageAtWidth(url: string, width: number, quality?: number) {
  if (!isCloudinaryImage(url)) return url;
  const [head, tail] = splitOnce(url, UPLOAD);
  const first = firstSegment(tail);
  const shaped = SHAPE_VALUES.has(first);
  const shape = shaped ? first : IMAGE_SHAPES.whole;
  const rest = shaped ? tail.slice(tail.indexOf('/') + 1) : tail;
  const q = quality ? `q_${quality}` : 'q_auto';
  return `${head}${UPLOAD}${shape},w_${width},f_auto,${q}/${rest}`;
}

function splitOnce(value: string, separator: string): [string, string] {
  const at = value.indexOf(separator);
  return [value.slice(0, at), value.slice(at + separator.length)];
}

const firstSegment = (path: string) => path.split('/')[0] ?? '';

/** The Cloudinary cloud a delivery URL belongs to, or null for any other URL. */
export function cloudNameOf(url: string) {
  return url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\//)?.[1] ?? null;
}
