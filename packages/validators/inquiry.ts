// The inquiry form (docs/api.md §2 submitInquiry). A phone or an email is required (owner's
// decision, 2026-11-02). The honeypot `website` and the time check are read by the action.
import { z } from 'zod';

import { blankToUndefined, id } from './common';
import { pkMobile } from './phone';
import { page } from './search';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional());

export const inquiryInput = z
  .object({
    productId: optional(id),
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: optional(z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email'))),
    phone: optional(pkMobile),
    message: z.string().trim().min(1, 'Write your question').max(2000),
    // The honeypot: people never see it, so anything in it means a bot. Accepted here, so a bot gets
    // no field error telling it so; the action answers as if saved and saves nothing.
    website: optional(z.string().max(500)),
    // When the form appeared, in ms since 1970 (set in the browser on mount, so a page cached for
    // hours still works). The action refuses a form sent under 2 seconds after it appeared.
    startedAt: optional(z.coerce.number().int().positive()),
  })
  .strict()
  .refine((i) => i.email !== undefined || i.phone !== undefined, {
    path: ['phone'],
    message: 'Add a phone number or an email',
  });

export type InquiryInput = z.infer<typeof inquiryInput>;

export const INQUIRY_STATUSES = ['new', 'contacted', 'closed'] as const;

// The admin moves an inquiry along: new → contacted → closed (or back).
export const inquiryStatusInput = z.object({ id, status: z.enum(INQUIRY_STATUSES) }).strict();

// The inbox's tabs and pages, read from the URL.
export const inquiryListInput = z
  .object({ status: z.enum(INQUIRY_STATUSES).default('new'), page: page.default(1) })
  .strict();

export type InquiryListInput = z.infer<typeof inquiryListInput>;
