// The inquiry form (docs/api.md §2 submitInquiry). A phone or an email is required (owner's
// decision, 2026-11-02). The honeypot `website` must stay empty; the time check is in the action.
import { z } from 'zod';

import { blankToUndefined, id } from './common';
import { pkMobile } from './phone';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional());

export const inquiryInput = z
  .object({
    productId: optional(id),
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: optional(z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email'))),
    phone: optional(pkMobile),
    message: z.string().trim().min(1, 'Write your question').max(2000),
    website: optional(z.string().max(0)),
  })
  .strict()
  .refine((i) => i.email !== undefined || i.phone !== undefined, {
    path: ['phone'],
    message: 'Add a phone number or an email',
  });

export type InquiryInput = z.infer<typeof inquiryInput>;
