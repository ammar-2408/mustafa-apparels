'use server';
// submitInquiry (docs/api.md §2, docs/architecture.md §5.3): rate limit, Zod, honeypot and time
// check, save, then email the shop. The email never decides the answer: the inquiry is saved.
import 'server-only';

import { hashIp } from '@mustafa/auth';
import { getEnv } from '@mustafa/config/env';
import { type ActionResult, fail, ok, toActionError } from '@mustafa/core/action-result';
import * as inquiries from '@mustafa/core/inquiries';
import { newInquiry } from '@mustafa/core/integrations/email-templates';
import * as settings from '@mustafa/core/settings';
import { getDb } from '@mustafa/db/client';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import { inquiryInput } from '@mustafa/validators/inquiry';
import { headers } from 'next/headers';

import { currentCustomer } from '../../../../lib/auth';
import { INQUIRY_LIMIT, MIN_FILL_MS } from '../../../../lib/inquiry-limits';
import { canonicalUrl } from '../../../../lib/seo';
import { getMailer, withinLimit } from '../../../../lib/services';

export async function submitInquiry(
  raw: unknown,
): Promise<ActionResult<{ inquiryId: string | null }>> {
  try {
    const requestHeaders = await headers();
    const ip = requestHeaders.get('x-nf-client-connection-ip') ?? 'no-ip';
    // Counted before anything else, so bots that fail the checks below still use up their tries.
    if (!(await withinLimit(INQUIRY_LIMIT, ip))) {
      return fail(
        'RATE_LIMITED',
        'Too many messages. Please wait a few minutes, or ask on WhatsApp.',
      );
    }
    const parsed = inquiryInput.safeParse(raw);
    if (!parsed.success) {
      return fail('VALIDATION', 'Check the highlighted fields', fieldErrorsOf(parsed.error));
    }
    const { website, startedAt, ...input } = parsed.data;
    // The hidden field filled, or a form sent in under 2 seconds: answer as if saved, save nothing.
    if (website || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
      return ok({ inquiryId: null });
    }

    const env = getEnv('web');
    const session = await currentCustomer();
    // Only a verified email links the question to an account (docs/api.md).
    const userId = session?.user.emailVerified ? session.user.id : undefined;
    const db = getDb();
    const created = await inquiries.create(db, {
      ...input,
      userId,
      ipHash:
        env.BETTER_AUTH_SECRET && ip !== 'no-ip' ? hashIp(ip, env.BETTER_AUTH_SECRET) : undefined,
    });

    const shop = await settings.get(db);
    const to = env.SHOP_INBOX_EMAIL ?? shop.email;
    if (to) {
      const mail = newInquiry({
        name: input.name,
        phone: input.phone,
        email: input.email,
        message: input.message,
        suit: created.suit && {
          name: created.suit.name,
          designCode: created.suit.designCode,
          url: canonicalUrl(`/products/${created.suit.slug}`),
        },
        inboxUrl: `${env.ADMIN_URL ?? 'https://admin.mustafaapparels.com'}/inquiries`,
      });
      // A failed or capped email is logged by the mailer; the shopper still gets their answer.
      await getMailer()({ to, kind: 'new-inquiry', ...mail }).catch(() => ({ ok: false }));
    }
    return ok({ inquiryId: created.id });
  } catch (error) {
    const result = toActionError(error);
    if (result.error.code === 'INTERNAL') console.error('[submitInquiry] failed');
    return result;
  }
}
