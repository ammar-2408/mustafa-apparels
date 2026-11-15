// A customer's own account actions (docs/api.md §2): saved suits, profile, delete account.
import './zod-config';

import { z } from 'zod';

import { blankToUndefined, id } from './fields';
import { pkMobile } from './phone';

export const wishlistInput = z.object({ productId: id, saved: z.boolean() }).strict();

export const profileInput = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    // Blank removes the number.
    phone: z.preprocess(blankToUndefined, pkMobile.optional()).transform((v) => v ?? null),
  })
  .strict();

export const deleteAccountInput = z
  .object({
    confirm: z.literal('DELETE', { error: 'Type DELETE in capital letters to confirm' }),
    password: z.string().min(1, 'Enter your password').max(128),
  })
  .strict();

export type WishlistInput = z.infer<typeof wishlistInput>;
export type ProfileInput = z.infer<typeof profileInput>;
