// Caps on every outgoing email (docs/auth-security.md §1): Resend's free plan sends 100 a day, so
// requests spread over many IPs mustn't be able to use them all up, and one kind of email must
// never crowd out another.
// - Account emails (verify, reset, "you already have an account"): 3 an hour per address (the
//   limiter's keys are HMACs, so no address reaches Upstash) and 60 a day in total.
// - Inquiry notices to the shop inbox: no per-address cap (it is always the same inbox, and the
//   owner must hear about every question), 30 a day in total. The form's own limit (5 per 10
//   minutes per IP) slows a flood; the questions are saved either way.
// 90 a day in all, which keeps 10 for the owner's own tests. Every cap fails open: an Upstash
// outage must not stop password resets or inquiry notices.
import type { Mailer } from './email';
import type { Limit, Limiter } from './rate-limit';

export const EMAIL_LIMITS = {
  perRecipient: { name: 'email-recipient', max: 3, windowSeconds: 3600, failMode: 'open' },
  accountDaily: { name: 'email-account-daily', max: 60, windowSeconds: 86_400, failMode: 'open' },
  shopDaily: { name: 'email-shop-daily', max: 30, windowSeconds: 86_400, failMode: 'open' },
} as const satisfies Record<string, Limit>;

/** Email kinds sent to the shop's own inbox, which count against the shop's budget. */
export const SHOP_NOTICE_KINDS = new Set(['new-inquiry']);

/** The same mailer, refusing (never throwing) an email over its caps. */
export function cappedMailer(
  mailer: Mailer,
  limiter: Limiter,
  log: (message: string) => void = (message) => console.error(message),
): Mailer {
  return async (email) => {
    if (SHOP_NOTICE_KINDS.has(email.kind)) {
      const shop = await limiter.consume(EMAIL_LIMITS.shopDaily, 'shop');
      if (!shop.allowed) {
        log(`[email] ${email.kind} not sent: the shop's daily cap of 30 notices is reached`);
        return { ok: false };
      }
      return mailer(email);
    }
    const recipient = await limiter.consume(
      EMAIL_LIMITS.perRecipient,
      email.to.trim().toLowerCase(),
    );
    if (!recipient.allowed) {
      log(`[email] ${email.kind} not sent: this address had 3 emails in the last hour`);
      return { ok: false };
    }
    const daily = await limiter.consume(EMAIL_LIMITS.accountDaily, 'all');
    if (!daily.allowed) {
      log(`[email] ${email.kind} not sent: the daily cap of 60 account emails is reached`);
      return { ok: false };
    }
    return mailer(email);
  };
}
