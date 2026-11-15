// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const allowed = vi.hoisted(() => ({ value: true }));
const session = vi.hoisted(() => ({ value: null as unknown }));
const send = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
const create = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'inq1',
    suit: { name: 'Black Suit', slug: 'black-suit', designCode: 'DHN-01' },
  })),
);
const shopEmail = vi.hoisted(() => ({ value: 'shop@example.com' as string | null }));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-nf-client-connection-ip': '203.0.113.9' }),
}));
vi.mock('@mustafa/config/env', () => ({
  getEnv: () => ({ BETTER_AUTH_SECRET: 's'.repeat(40), ADMIN_URL: 'https://admin.example.com' }),
}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/inquiries', () => ({ create }));
vi.mock('@mustafa/core/settings', () => ({ get: async () => ({ email: shopEmail.value }) }));
vi.mock('../../../../lib/auth', async () => {
  const { requireUser } = await import('@mustafa/auth/guards');
  return {
    currentCustomer: async () => {
      try {
        return requireUser(session.value as never);
      } catch {
        return null;
      }
    },
  };
});
vi.mock('../../../../lib/services', () => ({
  withinLimit: async () => allowed.value,
  getMailer: () => send,
}));

import { submitInquiry } from './actions';

const form = (extra: Record<string, unknown> = {}) => ({
  productId: 'p1',
  name: 'Ayesha',
  phone: '0300 1234567',
  email: '',
  message: 'Is this in stock?',
  website: '',
  startedAt: String(Date.now() - 10_000),
  ...extra,
});

beforeEach(() => {
  allowed.value = true;
  session.value = null;
  shopEmail.value = 'shop@example.com';
  send.mockClear();
  create.mockClear();
});

describe('submitInquiry', () => {
  it('saves the question with a hashed IP and emails the shop about the suit', async () => {
    expect(await submitInquiry(form())).toEqual({ ok: true, data: { inquiryId: 'inq1' } });
    expect(create).toHaveBeenCalledWith('db', {
      productId: 'p1',
      name: 'Ayesha',
      phone: '+923001234567',
      message: 'Is this in stock?',
      userId: undefined,
      ipHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'shop@example.com',
        kind: 'new-inquiry',
        subject: 'New question about Black Suit (DHN-01)',
      }),
    );
  });

  it('refuses when over the limit, before reading the form', async () => {
    allowed.value = false;
    const result = await submitInquiry({});
    expect(result).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    expect(create).not.toHaveBeenCalled();
  });

  it('shows field errors and saves nothing for a bad form', async () => {
    const result = await submitInquiry(form({ phone: '', email: '', name: 'A' }));
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    if (!result.ok) expect(Object.keys(result.error.fieldErrors ?? {})).toEqual(['name', 'phone']);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['the hidden field filled', { website: 'spam.example' }],
    ['sent under 2 seconds after it appeared', { startedAt: String(Date.now() - 500) }],
    ['no start time', { startedAt: '' }],
  ])('answers a bot (%s) as if saved, and saves nothing', async (_name, extra) => {
    expect(await submitInquiry(form(extra))).toEqual({ ok: true, data: { inquiryId: null } });
    expect(create).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('links a signed-in shopper only when their email is verified', async () => {
    session.value = { user: { id: 'u1', emailVerified: true }, session: { app: 'web' } };
    await submitInquiry(form());
    expect(create).toHaveBeenLastCalledWith('db', expect.objectContaining({ userId: 'u1' }));
    session.value = { user: { id: 'u2', emailVerified: false }, session: { app: 'web' } };
    await submitInquiry(form());
    expect(create).toHaveBeenLastCalledWith('db', expect.objectContaining({ userId: undefined }));
    // A banned customer's question is saved, but not linked to their account.
    session.value = {
      user: { id: 'u3', emailVerified: true, banned: true },
      session: { app: 'web' },
    };
    await submitInquiry(form());
    expect(create).toHaveBeenLastCalledWith('db', expect.objectContaining({ userId: undefined }));
  });

  it('still answers success when the email fails, or when no shop address is set', async () => {
    send.mockRejectedValueOnce(new Error('down'));
    expect(await submitInquiry(form())).toMatchObject({ ok: true });
    shopEmail.value = null;
    send.mockClear();
    expect(await submitInquiry(form())).toMatchObject({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });

  it('hides unexpected errors behind INTERNAL', async () => {
    create.mockRejectedValueOnce(new Error('relation "inquiry" does not exist'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await submitInquiry(form());
    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    expect(JSON.stringify(result)).not.toContain('relation');
    error.mockRestore();
  });
});
