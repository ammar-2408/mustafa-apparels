// Captures the emails Better Auth sends in integration tests.
import type { Email, Mailer } from '@mustafa/core/integrations/email';

export const outbox: Email[] = [];

export const sendEmail: Mailer = async (email) => {
  outbox.push(email);
  return { ok: true };
};

// The first link in the newest email to an address.
export function linkFor(to: string) {
  const email = outbox.findLast((e) => e.to === to);
  const link = email?.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error(`no email with a link to ${to}`);
  return link;
}
