// Brands the shop has no permission to name (docs/database.md §9). Add one when new stock shows
// another brand; remove one only with that brand's written permission.
// Matching ignores case, accents and punctuation, and finds whole names only, with or without
// spaces inside them: "Maria.B", "MARIAB" and "so-kamal" match, "Khaddar" and "also Kamal" don't.
import './zod-config';

import { z } from 'zod';

export const BANNED_TERMS = [
  'Elaf',
  'Baroque',
  'Maria B',
  'HS Fashion',
  'Khaadi',
  'Sobia Waseem',
  'Nishat',
  'So Kamal',
] as const;

export type BannedTerm = (typeof BANNED_TERMS)[number];

// NFKD folds full-width letters to ASCII and splits accents off, so they can be dropped.
const normalize = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\p{M}\u200B-\u200D\u2060\uFEFF]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');

const PATTERNS = BANNED_TERMS.map((term) => ({
  term,
  pattern: new RegExp(`\\b${normalize(term).trim().split(' ').join('\\s*')}\\b`),
}));

export function findBannedTerm(text: string): BannedTerm | null {
  const plain = normalize(text);
  return PATTERNS.find(({ pattern }) => pattern.test(plain))?.term ?? null;
}

// Wraps a string schema for any customer-facing text field.
export function noBannedTerms<T extends z.ZodType<string>>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    const term = findBannedTerm(value);
    if (term) ctx.addIssue({ code: 'custom', message: `Remove the brand name “${term}”` });
  }) as T;
}
