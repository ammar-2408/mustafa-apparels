import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createMailer, defaultOutboxDir, type Email } from './email';
import { existingAccount, resetPassword, verifyEmail } from './email-templates';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const ADDRESS = 'ayesha@example.com';
const LINK = 'https://mustafaapparels.com/api/auth/verify-email?token=secret-token';
const email: Email = { to: ADDRESS, kind: 'verify-email', ...verifyEmail({ url: LINK }) };

const live = (log = vi.fn()) => ({
  mailer: createMailer({
    mode: 'live',
    appEnv: 'production',
    apiKey: 're_test',
    from: 'Mustafa Apparels <no-reply@updates.mustafaapparels.com>',
    replyTo: 'ammarofficial321@gmail.com',
    log,
  }),
  log,
});

const expectNoPrivateData = (log: ReturnType<typeof vi.fn>) => {
  const logged = JSON.stringify(log.mock.calls);
  expect(logged).not.toContain(ADDRESS);
  expect(logged).not.toContain('secret-token');
};

describe('live mode (Resend)', () => {
  it('sends from our address with a reply-to the shop inbox', async () => {
    let request: Request | undefined;
    server.use(
      http.post('https://api.resend.com/emails', ({ request: r }) => {
        request = r.clone();
        return HttpResponse.json({ id: 'email_1' });
      }),
    );
    expect(await live().mailer(email)).toEqual({ ok: true });
    expect(request?.headers.get('authorization')).toBe('Bearer re_test');
    expect(await request?.json()).toMatchObject({
      from: 'Mustafa Apparels <no-reply@updates.mustafaapparels.com>',
      to: [ADDRESS],
      reply_to: 'ammarofficial321@gmail.com',
      subject: email.subject,
      text: expect.stringContaining(LINK),
    });
  });

  it('reports a Resend error as not sent, and logs no address or link', async () => {
    server.use(
      http.post('https://api.resend.com/emails', () => HttpResponse.json({}, { status: 422 })),
    );
    const { mailer, log } = live();
    expect(await mailer(email)).toEqual({ ok: false });
    expect(log).toHaveBeenCalledWith('[email] verify-email not sent: Resend answered 422');
    expectNoPrivateData(log);
  });

  it('reports a network failure as not sent', async () => {
    server.use(http.post('https://api.resend.com/emails', () => HttpResponse.error()));
    const { mailer, log } = live();
    expect(await mailer(email)).toEqual({ ok: false });
    expectNoPrivateData(log);
  });

  it('needs a key and a sender', () => {
    expect(() => createMailer({ mode: 'live', appEnv: 'production' })).toThrow(/RESEND_API_KEY/);
  });
});

describe('mock mode', () => {
  it('writes each email to the outbox in development and test', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'outbox-'));
    try {
      for (const appEnv of ['development', 'test']) {
        await createMailer({ mode: 'mock', appEnv, outboxDir: dir })(email);
      }
      const files = readdirSync(dir);
      expect(files).toHaveLength(2);
      const saved = JSON.parse(readFileSync(join(dir, files[0]!), 'utf8'));
      expect(saved).toMatchObject({ to: ADDRESS, subject: email.subject, kind: 'verify-email' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('only logs a note on a preview, with no address or link', async () => {
    const log = vi.fn();
    const mailer = createMailer({ mode: 'mock', appEnv: 'preview', outboxDir: '/nowhere', log });
    expect(await mailer(email)).toEqual({ ok: true });
    expect(log).toHaveBeenCalledWith('[email] verify-email not sent (mock mode)');
    expectNoPrivateData(log);
  });

  it('keeps the outbox in the repo root, whichever folder the app runs from', () => {
    const fromApp = defaultOutboxDir(join(process.cwd(), '..', '..', 'apps', 'web'));
    expect(fromApp).toBe(defaultOutboxDir(join(process.cwd(), '..', '..')));
    expect(fromApp.endsWith('.e2e-outbox')).toBe(true);
  });
});

describe('templates', () => {
  it.each([
    ['verify', verifyEmail],
    ['reset', resetPassword],
    ['existing account', existingAccount],
  ])('%s: has the link in both versions and escapes it in HTML', (_name, template) => {
    const url = 'https://mustafaapparels.com/x?a=1&b="2"';
    const { subject, html, text } = template({ url });
    expect(subject).toContain('Mustafa Apparels');
    expect(text).toContain(url);
    expect(html).toContain('https://mustafaapparels.com/x?a=1&amp;b=&quot;2&quot;');
    expect(html).not.toContain('"2"');
  });

  it('uses the brand palette: white page, powder blue band, ink button with white text', () => {
    const { html } = verifyEmail({ url: 'https://mustafaapparels.com/x' });
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('background:#A8C9C8');
    expect(html).toContain('background:#111111;color:#FFFFFF');
    expect(html).toContain('color:#4B5757');
    expect(html).not.toMatch(/FAF7EC|5C584E/i);
  });
});
