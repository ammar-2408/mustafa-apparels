import { describe, expect, it, vi } from 'vitest';

import { cappedMailer, EMAIL_LIMITS } from './email-caps';
import { createLimiter } from './rate-limit';

const limiter = () => createLimiter({ mode: 'mock', appEnv: 'test', secret: 'test-secret' });
const email = (to: string) => ({ to, subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', kind: 'test' });

describe('cappedMailer', () => {
  it('sends 3 emails an hour to one address, however it is written, then refuses quietly', async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const log = vi.fn();
    const mail = cappedMailer(send, limiter(), log);
    for (const to of ['a@example.com', 'A@Example.com ', 'a@example.com']) {
      expect(await mail(email(to))).toEqual({ ok: true });
    }
    expect(await mail(email('a@example.com'))).toEqual({ ok: false });
    expect(send).toHaveBeenCalledTimes(3);
    expect(log.mock.calls[0]![0]).not.toContain('a@example.com');
    // Another address is still fine.
    expect(await mail(email('b@example.com'))).toEqual({ ok: true });
  });

  it('stops at 90 emails a day across all addresses', async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const mail = cappedMailer(send, limiter(), () => {});
    for (let i = 0; i < EMAIL_LIMITS.daily.max; i++) await mail(email(`user${i}@example.com`));
    expect(await mail(email('one-more@example.com'))).toEqual({ ok: false });
    expect(send).toHaveBeenCalledTimes(90);
  });

  it('sends when the store is down, since both caps fail open', async () => {
    const down = {
      consume: async () => ({ allowed: true, retryAfter: null, unavailable: true as const }),
      check: async () => ({ allowed: true, retryAfter: null }),
    };
    const send = vi.fn(async () => ({ ok: true }));
    expect(await cappedMailer(send, down)(email('a@example.com'))).toEqual({ ok: true });
  });
});
