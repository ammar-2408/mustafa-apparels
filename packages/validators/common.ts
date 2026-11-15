// Field schemas shared by the other validators.
// Update schemas are built from fields with no .default(): Zod 4 applies a default even inside
// .partial(), which would reset fields an update never sent. Defaults belong on create schemas.
// This file checks text for banned brand names, so only the server and the admin may load it:
// anything the storefront's browser code imports takes its fields from fields.ts instead.
import './zod-config';

import { z } from 'zod';

import { noBannedTerms } from './banned-terms';
import { blankToNull } from './fields';

export { blankToNull, blankToUndefined, cloudinaryUrl, designCode, id, unique } from './fields';

export const slug = noBannedTerms(
  z
    .string()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and single hyphens'),
);

// Optional customer-facing text: blank is stored as null.
export const optionalText = (max: number) =>
  z.preprocess(blankToNull, noBannedTerms(z.string().trim().max(max)).nullable());
