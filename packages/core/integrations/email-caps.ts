// Caps on every outgoing email (docs/auth-security.md §1, Phase 3 review): Resend's free plan
// sends 100 a day, so requests spread over many IPs mustn't be able to use them all up.
// Per recipient, 3 an hour (the limiter's keys are HMACs, so no address reaches Upstash), and
// 90 a day in total, which keeps 10 for the owner's own tests. Both fail open: an Upstash outage
// must not stop password resets or inquiry emails.
import type { Mailer } from './email';
import type { Limit, Limiter } from './rate-limit';

export const EMAIL_LIMITS = {
  perRecipient: { name: 'email-recipient', max: 3, windowSeconds: 3600, failMode: 'open' },
  daily: { name: 'email-daily', max: 90, windowSeconds: 86_400, failMode: 'open' },
} as const satisfies Record<string, Limit>;

/** The same mailer, refusing (never throwing) an email over either cap. */
export function cappedMailer(
  mailer: Mailer,
  limiter: Limiter,
  log: (message: string) => void = (message) => console.error(message),
): Mailer {
  return async (email) => {
    const recipient = await limiter.consume(
      EMAIL_LIMITS.perRecipient,
      email.to.trim().toLowerCase(),
    );
    if (!recipient.allowed) {
      log(`[email] ${email.kind} not sent: this address had 3 emails in the last hour`);
      return { ok: false };
    }
    const daily = await limiter.consume(EMAIL_LIMITS.daily, 'all');
    if (!daily.allowed) {
      log(`[email] ${email.kind} not sent: the daily cap of 90 is reached`);
      return { ok: false };
    }
    return mailer(email);
  };
}
