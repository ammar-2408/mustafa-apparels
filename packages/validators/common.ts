// Field schemas shared by the other validators.
// Update schemas are built from fields with no .default(): Zod 4 applies a default even inside
// .partial(), which would reset fields an update never sent. Defaults belong on create schemas.
import './zod-config';

import { z } from 'zod';

import { noBannedTerms } from './banned-terms';

export const slug = noBannedTerms(
  z
    .string()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and single hyphens'),
);

export const designCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,20}$/, 'Use letters, numbers and hyphens, up to 20');

export const id = z.string().min(1).max(64);

const isBlank = (value: unknown) => typeof value === 'string' && value.trim() === '';

// Forms send "" for an empty field.
export const blankToUndefined = (value: unknown) => (isBlank(value) ? undefined : value);
export const blankToNull = (value: unknown) => (isBlank(value) ? null : value);

// Optional customer-facing text: blank is stored as null.
export const optionalText = (max: number) =>
  z.preprocess(blankToNull, noBannedTerms(z.string().trim().max(max)).nullable());

// A Cloudinary delivery URL.
export const cloudinaryUrl = z.url({
  protocol: /^https$/,
  hostname: /^res\.cloudinary\.com$/,
  error: 'Must be a Cloudinary https URL',
});

// Unique values, for lists of ids or keys.
export const unique = <T>(values: T[]) => new Set(values).size === values.length;
