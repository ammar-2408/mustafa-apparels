// Collections from the admin (docs/database.md §2 category).
import { z } from 'zod';

import { noBannedTerms } from './banned-terms';
import { blankToNull, cloudinaryUrl, id, optionalText, slug, unique } from './common';

// Shape only, no defaults (see common.ts).
const fields = {
  name: noBannedTerms(z.string().trim().min(2).max(60)),
  slug,
  description: optionalText(2000),
  imageUrl: z.preprocess(blankToNull, cloudinaryUrl.nullable()),
  imagePublicId: z.preprocess(blankToNull, z.string().max(200).nullable()),
  parentId: id.nullable(),
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
};

export const categoryInput = z
  .object(fields)
  .partial()
  .required({ name: true, slug: true })
  .strict()
  .transform((c) => ({
    description: null,
    imageUrl: null,
    imagePublicId: null,
    parentId: null,
    sortOrder: 0,
    isActive: true,
    seoTitle: null,
    seoDescription: null,
    ...c,
  }));

export type CategoryInput = z.infer<typeof categoryInput>;

export const categoryUpdateInput = z
  .object(fields)
  .partial()
  .extend({ id })
  .strict()
  .refine((c) => c.parentId !== c.id, {
    path: ['parentId'],
    message: 'A collection can’t be inside itself',
  });

export type CategoryUpdateInput = z.infer<typeof categoryUpdateInput>;

export const categoryReorderInput = z
  .object({
    ids: z.array(id).min(1).max(200).refine(unique, { message: 'List each collection once' }),
  })
  .strict();

// Hide or show a collection on the storefront.
export const categoryVisibilityInput = z.object({ id, isActive: z.boolean() }).strict();
