// Email through Resend (docs/integrations.md). No app code calls Resend directly.
// Live mode sends for real. Mock mode never sends: in development and test it writes each email
// to .e2e-outbox/ in the repo root for Playwright to read, and on a preview it only logs a note.
// Logs never hold an address, a token or a link.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Which template, for logs only.
  kind: string;
};

export type SendResult = { ok: boolean };

export type Mailer = (email: Email) => Promise<SendResult>;

export type MailerOptions = {
  mode: 'live' | 'mock';
  appEnv: string | undefined;
  apiKey?: string | undefined;
  from?: string | undefined;
  replyTo?: string | undefined;
  // Mock mode only. Defaults to .e2e-outbox in the repo root.
  outboxDir?: string;
  log?: (message: string) => void;
};

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

export const OUTBOX = '.e2e-outbox';

// The repo root holds pnpm-workspace.yaml; Next runs from apps/<app>, Playwright from the root.
export function defaultOutboxDir(start = process.cwd()) {
  let dir = start;
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) return join(start, OUTBOX);
    dir = parent;
  }
  return join(dir, OUTBOX);
}

export function createMailer(options: MailerOptions): Mailer {
  const log = options.log ?? ((message: string) => console.error(message));
  return options.mode === 'live' ? resendMailer(options, log) : mockMailer(options, log);
}

function resendMailer({ apiKey, from, replyTo }: MailerOptions, log: (m: string) => void): Mailer {
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and EMAIL_FROM are needed in live mode');
  return async ({ to, subject, html, text, kind }) => {
    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
          ...(replyTo && { reply_to: replyTo }),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return { ok: true };
      log(`[email] ${kind} not sent: Resend answered ${response.status}`);
    } catch (error) {
      log(`[email] ${kind} not sent: ${error instanceof Error ? error.name : 'unknown error'}`);
    }
    return { ok: false };
  };
}

function mockMailer({ appEnv, outboxDir }: MailerOptions, log: (m: string) => void): Mailer {
  const local = appEnv === 'development' || appEnv === 'test';
  return async (email) => {
    if (!local) {
      log(`[email] ${email.kind} not sent (mock mode)`);
      return { ok: true };
    }
    const dir = outboxDir ?? defaultOutboxDir();
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${Date.now()}-${randomUUID()}.json`);
    writeFileSync(file, JSON.stringify({ ...email, sentAt: new Date().toISOString() }, null, 2));
    return { ok: true };
  };
}
