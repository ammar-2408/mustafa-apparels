// Photos and videos as the admin sends them (docs/api.md §5.2). Width, height, bytes, format
// and duration are read from Cloudinary on the server, never accepted from the browser.
import { z } from 'zod';

import { noBannedTerms } from './banned-terms';
import { cloudinaryUrl, id, unique } from './common';

const publicId = z.string().startsWith('products/', 'Must be in the products folder').max(200);

export const mediaInput = z
  .object({
    kind: z.enum(['image', 'video']),
    publicId,
    url: cloudinaryUrl,
    alt: noBannedTerms(z.string().trim().min(3).max(200)),
    posterPublicId: publicId.nullable(),
    sortOrder: z.number().int().min(0),
    isPrimary: z.boolean(),
  })
  .strict()
  .refine((m) => !m.isPrimary || m.kind === 'image', {
    path: ['isPrimary'],
    message: 'The main item must be a photo',
  });

export type MediaInput = z.infer<typeof mediaInput>;

export const mediaListInput = z
  .array(mediaInput)
  .max(30)
  .refine((list) => list.filter((m) => m.isPrimary).length <= 1, {
    message: 'Choose one main photo',
  })
  .refine((list) => unique(list.map((m) => m.publicId)), {
    message: 'Each photo or video can be added once',
  });

// POST /api/upload/sign: what is being uploaded, and to which suit or collection. The server
// picks the public id and folder from these, never from the browser.
export const uploadSignInput = z
  .object({
    kind: z.enum(['image', 'video']),
    target: z.enum(['product', 'category']),
    targetId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[\w-]+$/),
    // A video's poster image; images only.
    purpose: z.literal('poster').optional(),
  })
  .strict()
  .refine((input) => input.purpose !== 'poster' || input.kind === 'image', {
    path: ['purpose'],
    message: 'A poster is a photo',
  });

export type UploadSignInput = z.infer<typeof uploadSignInput>;

// --- The admin's media actions (docs/api.md §3) ---

// A public id the server signed: products/<id>/<name> or categories/<id>/<name>.
export const assetId = z
  .string()
  .max(200)
  .regex(/^(products|categories)\/[\w-]+\/[\w-]+$/, 'Not one of our uploads');

const alt = noBannedTerms(z.string().trim().min(3, 'Describe the photo in a few words').max(200));

export const mediaAddInput = z
  .object({ productId: id, kind: z.enum(['image', 'video']), publicId: assetId, alt })
  .strict();

export const mediaReorderInput = z
  .object({
    productId: id,
    mediaIds: z.array(id).min(1).max(30).refine(unique, { message: 'List each item once' }),
  })
  .strict();

export const mediaPrimaryInput = z.object({ productId: id, mediaId: id }).strict();

// null goes back to the video's first frame.
export const mediaPosterInput = z
  .object({ mediaId: id, posterPublicId: assetId.nullable() })
  .strict();

export const mediaAltInput = z.object({ mediaId: id, alt }).strict();

export const mediaDeleteInput = z.object({ mediaId: id }).strict();
