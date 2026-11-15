// Field schemas with no brand check, safe to load in the browser. The storefront's forms import
// validators built from these (inquiry, auth), and the browser bundle must never carry the list
// of banned brand names (docs/database.md §9). Schemas that check text for brands live in
// common.ts, which only the server and the admin load.
import './zod-config';

import { z } from 'zod';

export const designCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,20}$/, 'Use letters, numbers and hyphens, up to 20');

export const id = z.string().min(1).max(64);

const isBlank = (value: unknown) => typeof value === 'string' && value.trim() === '';

// Forms send "" for an empty field.
export const blankToUndefined = (value: unknown) => (isBlank(value) ? undefined : value);
export const blankToNull = (value: unknown) => (isBlank(value) ? null : value);

// A Cloudinary delivery URL.
export const cloudinaryUrl = z.url({
  protocol: /^https$/,
  hostname: /^res\.cloudinary\.com$/,
  error: 'Must be a Cloudinary https URL',
});

// Unique values, for lists of ids or keys.
export const unique = <T>(values: T[]) => new Set(values).size === values.length;
