// Suit fields from the admin (docs/api.md §5.1). Field values come from docs/catalog.md §4.
import { z } from 'zod';

import { noBannedTerms } from './banned-terms';
import { designCode, id, optionalText, slug } from './common';
import { page, productFilters, SORTS } from './search';
import {
  COLOR_FAMILIES,
  DESIGNS,
  DRESS_CATEGORIES,
  FABRICS,
  OUTFIT_STYLES,
  PIECES,
  SEASONS,
} from './taxonomy';

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export const AVAILABILITY = ['in_stock', 'low_stock', 'out_of_stock'] as const;

const pieceDetail = z
  .object({
    piece: z.enum(['shirt', 'dupatta', 'trouser']),
    // Shown on the product page, so no other brand's name.
    fabric: noBannedTerms(z.string().trim().min(1).max(40)).optional(),
    finish: noBannedTerms(z.string().trim().max(40)).optional(),
    // Fabric length in metres.
    length_m: z.number().positive().max(10).optional(),
  })
  .strict();

const price = z.number().int().min(0).max(10_000_000);

// Shape only, no defaults (see common.ts).
const fields = {
  name: noBannedTerms(z.string().trim().min(2).max(120)),
  slug,
  designCode: designCode.nullable(),
  description: noBannedTerms(z.string().trim().max(5000)),
  price: price.nullable(),
  compareAtPrice: price.positive().nullable(),
  categoryId: id,
  pieces: z.enum(PIECES),
  pieceDetails: z
    .array(pieceDetail)
    .max(3)
    .refine((list) => new Set(list.map((p) => p.piece)).size === list.length, {
      message: 'List each piece once',
    }),
  collectionType: optionalText(40),
  dressCategories: z.array(z.enum(DRESS_CATEGORIES)).max(DRESS_CATEGORIES.length),
  fabric: z.enum(FABRICS),
  design: z.array(z.enum(DESIGNS)).max(DESIGNS.length),
  season: z.enum(SEASONS).nullable(),
  outfitStyle: z.enum(OUTFIT_STYLES).nullable(),
  mainColor: optionalText(30),
  colorFamily: z.enum(COLOR_FAMILIES).nullable(),
  accentColors: z.array(noBannedTerms(z.string().trim().min(1).max(30))).max(12),
  motifs: z.array(noBannedTerms(z.string().trim().min(1).max(60))).max(12),
  relatedDesignCodes: z.array(designCode).max(10),
  careInstructions: noBannedTerms(z.string().trim().max(1000)),
  availability: z.enum(AVAILABILITY),
  status: z.enum(PRODUCT_STATUSES),
  featured: z.boolean(),
  attributes: z.record(z.string(), z.unknown()),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
};

type RuleFields = {
  status: (typeof PRODUCT_STATUSES)[number];
  price: number | null;
  compareAtPrice: number | null;
  mainColor: string | null;
  colorFamily: string | null;
};

// Rules across fields. Exported so core can re-check a stored row after merging an update.
export function productRuleErrors(p: RuleFields): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (p.status === 'published' && p.price === null) {
    errors.price = ['Add a price before publishing'];
  }
  if (p.status === 'published' && (p.mainColor === null || p.colorFamily === null)) {
    errors.colorFamily = ['Add a colour before publishing'];
  }
  if (p.compareAtPrice !== null && (p.price === null || p.compareAtPrice <= p.price)) {
    errors.compareAtPrice = ['Must be higher than price'];
  }
  return errors;
}

const addRuleIssues = (p: RuleFields, ctx: z.RefinementCtx) => {
  for (const [path, messages] of Object.entries(productRuleErrors(p))) {
    for (const message of messages) ctx.addIssue({ code: 'custom', path: [path], message });
  }
};

const piecesFit = (p: { pieces: (typeof PIECES)[number]; pieceDetails: unknown[] }) =>
  p.pieceDetails.length <= (p.pieces === 'two_piece' ? 2 : 3);

export const productInput = z
  .object({
    ...fields,
    description: fields.description.default(''),
    careInstructions: fields.careInstructions.default(''),
    attributes: fields.attributes.default({}),
    seoTitle: fields.seoTitle.optional(),
    seoDescription: fields.seoDescription.optional(),
  })
  .strict()
  .refine(piecesFit, { path: ['pieceDetails'], message: 'Too many pieces for this suit' })
  .superRefine(addRuleIssues);

export type ProductInput = z.infer<typeof productInput>;

// Only the fields that change. Cross-field rules need the stored row, so core checks them.
export const productUpdateInput = z.object(fields).partial().extend({ id }).strict();

export type ProductUpdateInput = z.infer<typeof productUpdateInput>;

export const productStatusInput = z.object({ id, status: z.enum(PRODUCT_STATUSES) }).strict();

export const productListInput = z
  .object({
    categorySlug: slug.optional(),
    page: page.default(1),
    sort: z.enum(SORTS).default('newest'),
    filters: productFilters.default({}),
  })
  .strict();

export type ProductListInput = z.infer<typeof productListInput>;

// The admin's suit list (`/suits?q=&status=&collection=&needsPrice=1&page=`). Read from the URL,
// so every value arrives as a string; anything unknown is refused and the page shows the
// unfiltered list.
export const adminProductListInput = z
  .object({
    q: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((value) => (value ? value : undefined)),
    status: z.enum(PRODUCT_STATUSES).optional(),
    collection: id.optional(),
    needsPrice: z
      .enum(['1'])
      .optional()
      .transform((value) => value === '1'),
    page: page.default(1),
  })
  .strict();

export type AdminProductListInput = z.infer<typeof adminProductListInput>;

// The admin form (docs/api.md §3). Never status or attributes: a new suit is always a draft,
// publishing has its own action with the publish checks, and check: items are cleared one by one.
const formFields = z.object(fields).omit({ status: true, attributes: true }).shape;

export const productCreateInput = z
  .object({
    ...formFields,
    description: formFields.description.default(''),
    careInstructions: formFields.careInstructions.default(''),
    seoTitle: formFields.seoTitle.optional(),
    seoDescription: formFields.seoDescription.optional(),
  })
  .strict()
  .refine(piecesFit, { path: ['pieceDetails'], message: 'Too many pieces for this suit' })
  .superRefine((p, ctx) => addRuleIssues({ ...p, status: 'draft' }, ctx));

export type ProductCreateInput = z.infer<typeof productCreateInput>;

export const productEditInput = z.object(formFields).partial().extend({ id }).strict();

export type ProductEditInput = z.infer<typeof productEditInput>;

// The form's field names, for the field config's drift test.
export const PRODUCT_FORM_FIELDS = Object.keys(formFields) as (keyof typeof formFields)[];

// Publish (draft → published) or unpublish (published → draft); archive and restore have their
// own actions.
export const productPublishInput = z
  .object({ id, status: z.enum(['published', 'draft']) })
  .strict();

// Duplicate, archive, restore.
export const productIdInput = z.object({ id }).strict();

// Mark one check: item done, by its text.
export const productCheckInput = z.object({ id, check: z.string().min(1).max(500) }).strict();
