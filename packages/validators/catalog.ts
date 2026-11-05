// The files in catalog/ (docs/catalog.md §3): one suit per <design-id>.md and one _collection.md per
// collection, each YAML front matter plus a body. Suit files may only use the taxonomy values
// (§4); _collection.md keeps the source file's wording, such as "Printed". Every string is checked
// for other brands' names, including check:, notes: and the body, because the import uploads and
// stores them. Cross-file rules (unique IDs, two-way links) live in scripts/import-stock.
import { z } from 'zod';

import { noBannedTerms } from './banned-terms';
import { designCode, slug } from './common';
import { MEDIA_LIMITS } from './media';
import { pieceDetail, piecesFit, type ProductInput } from './product';
import {
  COLOR_FAMILIES,
  DESIGNS,
  DRESS_CATEGORIES,
  FABRICS,
  OUTFIT_STYLES,
  PIECE_LABELS,
  type Pieces,
  type Season,
  SEASON_LABELS,
} from './taxonomy';

const byLabel = <T extends string>(labels: Record<T, string>) =>
  Object.fromEntries(Object.entries(labels).map(([value, label]) => [label, value])) as Record<
    string,
    T
  >;
const PIECES_BY_LABEL = byLabel<Pieces>(PIECE_LABELS);
const SEASON_BY_LABEL = byLabel<Season>(SEASON_LABELS);

const volumeStyle = z.enum(Object.values(PIECE_LABELS) as [string, ...string[]]);
const seasonLabel = z.enum(Object.values(SEASON_LABELS) as [string, ...string[]]);

const text = (max: number, min = 1) => noBannedTerms(z.string().trim().min(min).max(max));

export const DESIGN_ID = /^([A-Z]{3})-(\d{2})$/;

// Relative to "Business data/Stock/", forward slashes, no "..", no drive or leading slash.
const stockPath = (extensions: readonly string[]) =>
  z
    .string()
    .regex(/^[\w .-]+(\/[\w .-]+)*$/, 'Use a path relative to Business data/Stock, with /')
    .refine((path) => !path.split('/').some((part) => part === '..' || part === '.'), {
      message: 'The path must stay inside Business data/Stock',
    })
    .refine((path) => extensions.includes(path.split('.').pop()?.toLowerCase() ?? ''), {
      message: `Use one of: ${extensions.join(', ')}`,
    });

const IMAGE_EXTENSIONS = ['jpeg', ...MEDIA_LIMITS.image.formats];
const VIDEO_EXTENSIONS = MEDIA_LIMITS.video.formats;

const pixels = z.number().int().min(0);
const crop = z
  .object({ x: pixels, y: pixels, width: pixels.positive(), height: pixels.positive() })
  .strict();

const alt = text(200, 3);

const photo = z.object({ file: stockPath(IMAGE_EXTENSIONS), alt, crop: crop.optional() }).strict();
const video = z.object({ file: stockPath(VIDEO_EXTENSIONS), alt }).strict();

const pieceDetails = z
  .array(pieceDetail)
  .max(3)
  .refine((list) => new Set(list.map((p) => p.piece)).size === list.length, {
    message: 'List each piece once',
  });

export const suitFile = z
  .object({
    design_id: z.string().regex(DESIGN_ID, 'Use <PREFIX>-<two digits>, such as DHN-05'),
    collection: slug,
    status: z.literal('draft', { error: 'Always draft here: publishing happens in admin' }),
    price: z.null({ error: 'Leave price empty: the owner sets it in admin' }),
    name: text(120, 2),
    slug,
    volume_style: volumeStyle,
    dress_categories: z.array(z.enum(DRESS_CATEGORIES)).min(1).max(DRESS_CATEGORIES.length),
    collection_type: text(40).nullable().default(null),
    fabric: z.enum(FABRICS),
    piece_details: pieceDetails,
    design: z.array(z.enum(DESIGNS)).min(1).max(DESIGNS.length),
    season: seasonLabel,
    outfit_style: z.enum(OUTFIT_STYLES).nullable().default(null),
    main_color: text(30),
    color_family: z.enum(COLOR_FAMILIES),
    accent_colors: z.array(text(30)).max(12).default([]),
    motifs: z.array(text(60)).max(12).default([]),
    photos: z.array(photo).min(1, 'List at least one photo, the main image first').max(30),
    videos: z.array(video).max(10).default([]),
    also_in_this_design: z.array(designCode).max(10).default([]),
    notes: z.array(text(500)).max(20).default([]),
    check: z.array(text(500)).max(20).default([]),
    body: text(1000),
  })
  .strict()
  .superRefine((suit, ctx) => {
    const id = suit.design_id.toLowerCase();
    if (!suit.slug.endsWith(`-${id}`)) {
      ctx.addIssue({ code: 'custom', path: ['slug'], message: `End the slug with -${id}` });
    }
    if (
      !piecesFit({ pieces: PIECES_BY_LABEL[suit.volume_style]!, pieceDetails: suit.piece_details })
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['piece_details'],
        message: 'Too many pieces for this volume style',
      });
    }
    if (suit.also_in_this_design.includes(suit.design_id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['also_in_this_design'],
        message: 'A suit cannot link to itself',
      });
    }
  });

export type SuitFile = z.infer<typeof suitFile>;

export const collectionFile = z
  .object({
    collection: slug,
    title: text(60),
    prefix: z.string().regex(/^[A-Z]{3}$/, 'Use three capital letters, such as DHN'),
    source_file: stockPath(['md']),
    volume_style: volumeStyle,
    collection_type: text(40).nullable().default(null),
    dress_categories: z.array(z.enum(DRESS_CATEGORIES)).min(1),
    fabric: z.enum(FABRICS),
    piece_details: pieceDetails,
    // The source file's own words, such as "Printed"; each suit names the allowed value.
    design: z.array(text(40)).min(1),
    season: seasonLabel,
    outfit_style: z.enum(OUTFIT_STYLES).nullable().default(null),
    body: text(20_000),
  })
  .strict();

export type CollectionFile = z.infer<typeof collectionFile>;

// The draft the import creates (docs/catalog.md §6). Price, status and availability are never
// taken from the file: a new suit is a draft with no price, in stock by default.
export function toProductInput(suit: SuitFile, categoryId: string): ProductInput {
  return {
    name: suit.name,
    slug: suit.slug,
    designCode: suit.design_id,
    description: suit.body,
    price: null,
    compareAtPrice: null,
    categoryId,
    pieces: PIECES_BY_LABEL[suit.volume_style]!,
    pieceDetails: suit.piece_details,
    collectionType: suit.collection_type,
    dressCategories: suit.dress_categories,
    fabric: suit.fabric,
    design: suit.design,
    season: SEASON_BY_LABEL[suit.season]!,
    outfitStyle: suit.outfit_style,
    mainColor: suit.main_color,
    colorFamily: suit.color_family,
    accentColors: suit.accent_colors,
    motifs: suit.motifs,
    relatedDesignCodes: suit.also_in_this_design,
    careInstructions: '',
    availability: 'in_stock',
    status: 'draft',
    featured: false,
    attributes: { checks: suit.check },
  };
}
