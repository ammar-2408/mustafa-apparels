// Pakistani mobile numbers, stored as E.164 (docs/database.md §7). Mobiles only, because the
// shop replies on WhatsApp.
import './zod-config';

import { z } from 'zod';

export function toPkMobile(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, '');
  const match = /^(?:\+92|0092|92|0)(3\d{9})$/.exec(digits);
  return match ? `+92${match[1]}` : null;
}

export const pkMobile = z.string().transform((raw, ctx) => {
  const phone = toPkMobile(raw);
  if (phone) return phone;
  ctx.addIssue({ code: 'custom', message: 'Enter a Pakistani mobile number, like 0300 1234567' });
  return z.NEVER;
});
