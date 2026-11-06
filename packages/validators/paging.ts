// The page number in a list URL (ADR-017): /shop/page/2, /collections/<slug>/page/2.
import './zod-config';

import { z } from 'zod';

// A whole number of 2 or more, written plainly: no leading zero, sign, decimal or spaces.
// Page 1 has no /page/1 URL; next.config sends it to the clean URL.
export const laterPageParam = z
  .string()
  .regex(/^[1-9]\d{0,3}$/)
  .transform(Number)
  .pipe(z.number().int().min(2));
