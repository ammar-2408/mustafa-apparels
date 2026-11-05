// What a suit needs before it can go on the site (docs/database.md §2 product_media rules):
// a price, a colour, a main photo, alt text on every photo and video, and no other brand's
// name anywhere a customer or search engine can read, and no open check: items (docs/catalog.md).
// Every problem is reported at once.
import { productMedia } from '@mustafa/db/schema';
import { findBannedTerm } from '@mustafa/validators/banned-terms';
import { productRuleErrors } from '@mustafa/validators/product';

import type { FieldErrors } from '../errors';
import type { Product } from './index';

type Media = Pick<typeof productMedia.$inferSelect, 'kind' | 'alt' | 'isPrimary'>;

// Customer-facing text on the suit itself.
const TEXT_FIELDS = [
  'name',
  'slug',
  'description',
  'careInstructions',
  'collectionType',
  'mainColor',
  'accentColors',
  'motifs',
  'seoTitle',
  'seoDescription',
] as const satisfies readonly (keyof Product)[];

const brandIn = (value: string | string[] | null) =>
  [value ?? []]
    .flat()
    .map(findBannedTerm)
    .find((term) => term !== null) ?? null;

const brandMessage = (term: string) => `Remove the brand name “${term}”`;

// The owner's open check: items, kept on the suit as attributes.checks (filled by the import).
export function openChecks(attributes: Record<string, unknown>): string[] {
  const checks = attributes.checks;
  return Array.isArray(checks) ? checks.filter((c): c is string => typeof c === 'string') : [];
}

export function publishErrors(suit: Product, media: Media[]): FieldErrors {
  const errors: FieldErrors = productRuleErrors({ ...suit, status: 'published' });

  for (const field of TEXT_FIELDS) {
    const term = brandIn(suit[field]);
    if (term) errors[field] = [brandMessage(term)];
  }

  const checks = openChecks(suit.attributes);
  if (checks.length > 0) {
    errors.checks = [
      checks.length === 1
        ? 'Clear the open check first'
        : `Clear the ${checks.length} open checks first`,
    ];
  }

  const mediaErrors: string[] = [];
  if (!media.some((m) => m.isPrimary && m.kind === 'image'))
    mediaErrors.push('Choose a main photo');
  if (media.some((m) => m.alt.trim().length < 3)) {
    mediaErrors.push('Add alt text to every photo and video');
  }
  const term = brandIn(media.map((m) => m.alt));
  if (term) mediaErrors.push(brandMessage(term));
  if (mediaErrors.length > 0) errors.media = mediaErrors;

  return errors;
}
