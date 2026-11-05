// One entry per field of the suit form (docs/feature-development.md). The form is drawn from this
// list and the browser reads the values back with readProductForm, so adding a field is one entry
// here plus the schema. Options come from packages/validators/taxonomy.ts, so filters and the form
// can't drift apart (test: product-fields.test.ts). There are no size fields: suits are unstitched.
import { AVAILABILITY, type ProductCreateInput } from '@mustafa/validators/product';
import {
  COLOR_FAMILIES,
  DESIGNS,
  DRESS_CATEGORIES,
  FABRICS,
  OUTFIT_STYLES,
  PIECE_LABELS,
  PIECES,
  SEASON_LABELS,
  SEASONS,
} from '@mustafa/validators/taxonomy';

export type Option = { value: string; label: string };

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'price'
  | 'select'
  | 'checkboxes'
  | 'tags'
  | 'toggle'
  | 'pieces'
  | 'collection';

export type FormFieldName = Exclude<keyof ProductCreateInput, never>;

export type FieldConfig = {
  name: FormFieldName;
  label: string;
  kind: FieldKind;
  section: Section;
  hint?: string;
  maxLength?: number;
  required?: boolean;
  options?: readonly Option[];
  // A select with an empty first choice that saves as null.
  emptyLabel?: string;
  // A new suit's starting value.
  defaultValue?: string;
};

export const SECTIONS = [
  'Basics',
  'Price',
  'Filters',
  'Pieces',
  'Colour',
  'Description and care',
  'Search engines',
] as const;
export type Section = (typeof SECTIONS)[number];

const same = (values: readonly string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

export const AVAILABILITY_LABELS: Record<(typeof AVAILABILITY)[number], string> = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
};

export const PRODUCT_FIELDS: readonly FieldConfig[] = [
  {
    name: 'name',
    label: 'Name',
    kind: 'text',
    section: 'Basics',
    required: true,
    maxLength: 120,
    hint: 'Main colour, detail, Embroidered or Printed, fabric, pieces: "Black Embroidered Dhanak 3-Piece Suit".',
  },
  {
    name: 'slug',
    label: 'Web address',
    kind: 'text',
    section: 'Basics',
    required: true,
    maxLength: 140,
    hint: 'Filled from the name and design code; ends with the design code.',
  },
  {
    name: 'designCode',
    label: 'Design code',
    kind: 'text',
    section: 'Basics',
    maxLength: 20,
    hint: 'Shown to customers, e.g. KDR-13. Never reuse a code.',
  },
  {
    name: 'categoryId',
    label: 'Collection',
    kind: 'collection',
    section: 'Basics',
    required: true,
  },
  {
    name: 'collectionType',
    label: 'Display tag',
    kind: 'text',
    section: 'Basics',
    maxLength: 40,
    hint: 'Optional, e.g. Premium. Not a filter.',
  },
  {
    name: 'availability',
    label: 'Availability',
    kind: 'select',
    section: 'Basics',
    options: AVAILABILITY.map((value) => ({ value, label: AVAILABILITY_LABELS[value] })),
  },
  { name: 'featured', label: 'Feature on the home page', kind: 'toggle', section: 'Basics' },

  {
    name: 'price',
    label: 'Price (Rs)',
    kind: 'price',
    section: 'Price',
    hint: 'Whole rupees. A draft can be saved without one; publishing needs it.',
  },
  {
    name: 'compareAtPrice',
    label: 'Was price (Rs)',
    kind: 'price',
    section: 'Price',
    hint: 'Optional. Shown crossed out; must be higher than the price.',
  },

  {
    name: 'pieces',
    label: 'Pieces',
    kind: 'select',
    section: 'Filters',
    defaultValue: 'three_piece',
    options: PIECES.map((value) => ({ value, label: PIECE_LABELS[value] })),
  },
  { name: 'fabric', label: 'Fabric', kind: 'select', section: 'Filters', options: same(FABRICS) },
  {
    name: 'design',
    label: 'Design',
    kind: 'checkboxes',
    section: 'Filters',
    options: same(DESIGNS),
    hint: 'Digital Print and Block Print only when you know it.',
  },
  {
    name: 'dressCategories',
    label: 'Dress category',
    kind: 'checkboxes',
    section: 'Filters',
    options: same(DRESS_CATEGORIES),
  },
  {
    name: 'season',
    label: 'Season',
    kind: 'select',
    section: 'Filters',
    emptyLabel: 'Not set',
    options: SEASONS.map((value) => ({ value, label: SEASON_LABELS[value] })),
  },
  {
    name: 'outfitStyle',
    label: 'Outfit style',
    kind: 'select',
    section: 'Filters',
    emptyLabel: 'Not set',
    options: same(OUTFIT_STYLES),
    hint: 'Leave unset unless you know it.',
  },

  {
    name: 'pieceDetails',
    label: "What's included",
    kind: 'pieces',
    section: 'Pieces',
    hint: 'One row per piece. Length only when you know it.',
  },

  {
    name: 'mainColor',
    label: 'Main colour',
    kind: 'text',
    section: 'Colour',
    maxLength: 30,
    hint: 'As customers would say it, e.g. Sage Green. Needed to publish.',
  },
  {
    name: 'colorFamily',
    label: 'Colour filter',
    kind: 'select',
    section: 'Colour',
    emptyLabel: 'Not set',
    options: same(COLOR_FAMILIES),
    hint: 'The filter it appears under. Needed to publish.',
  },
  {
    name: 'accentColors',
    label: 'Accent colours',
    kind: 'tags',
    section: 'Colour',
    hint: 'Separate with commas, up to 12.',
  },
  {
    name: 'motifs',
    label: 'Motifs',
    kind: 'tags',
    section: 'Colour',
    hint: 'E.g. paisley, floral border. Separate with commas.',
  },
  {
    name: 'relatedDesignCodes',
    label: 'Same design in other colours',
    kind: 'tags',
    section: 'Colour',
    hint: 'Design codes, separated with commas.',
  },

  {
    name: 'description',
    label: 'Description',
    kind: 'textarea',
    section: 'Description and care',
    maxLength: 5000,
    hint: '1–2 short sentences naming the fabric and season. No claims about softness, warmth, quality or stock.',
  },
  {
    name: 'careInstructions',
    label: 'Care',
    kind: 'textarea',
    section: 'Description and care',
    maxLength: 1000,
    hint: 'Optional; hidden on the shop when empty.',
  },

  {
    name: 'seoTitle',
    label: 'Search title',
    kind: 'text',
    section: 'Search engines',
    maxLength: 70,
    hint: 'Optional; the name is used when empty.',
  },
  {
    name: 'seoDescription',
    label: 'Search description',
    kind: 'textarea',
    section: 'Search engines',
    maxLength: 160,
    hint: 'Optional; the description is used when empty.',
  },
];

export const PIECE_ROWS = [
  { piece: 'shirt', label: 'Shirt' },
  { piece: 'dupatta', label: 'Dupatta' },
  { piece: 'trouser', label: 'Trouser' },
] as const;

const NULLABLE_TEXT = new Set<FormFieldName>([
  'designCode',
  'collectionType',
  'mainColor',
  'seoTitle',
  'seoDescription',
]);

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

// The form's values in the schema's shape. Blank optional fields become null, prices numbers,
// checkbox groups and comma lists arrays. The schema then decides what is valid.
export function readProductForm(form: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of PRODUCT_FIELDS) {
    const raw = text(form, field.name);
    switch (field.kind) {
      case 'price':
        values[field.name] = raw === '' ? null : Number(raw.replace(/[,\s]/g, ''));
        break;
      case 'checkboxes':
        values[field.name] = form.getAll(field.name).map(String);
        break;
      case 'tags':
        values[field.name] = raw
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
        break;
      case 'toggle':
        values[field.name] = form.get(field.name) === 'on';
        break;
      case 'select':
        values[field.name] = raw === '' && field.emptyLabel ? null : raw;
        break;
      case 'pieces':
        values[field.name] = PIECE_ROWS.filter(
          ({ piece }) => form.get(`piece-${piece}`) === 'on',
        ).map(({ piece }) => {
          const fabric = text(form, `piece-${piece}-fabric`);
          const finish = text(form, `piece-${piece}-finish`);
          const length = text(form, `piece-${piece}-length`);
          return {
            piece,
            ...(fabric && { fabric }),
            ...(finish && { finish }),
            ...(length && { length_m: Number(length) }),
          };
        });
        break;
      default:
        values[field.name] = NULLABLE_TEXT.has(field.name) && raw === '' ? null : raw;
    }
  }
  return values;
}
