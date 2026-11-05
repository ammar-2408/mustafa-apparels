import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatPrice } from './format';

describe('format', () => {
  it('writes whole rupees with thousands separators', () => {
    expect(formatPrice(4500)).toBe('Rs 4,500');
    expect(formatPrice(12500)).toBe('Rs 12,500');
    expect(formatPrice(0)).toBe('Rs 0');
  });

  it('writes dates in Pakistan time', () => {
    // 20:30 UTC is 01:30 the next day in Karachi (UTC+5).
    const at = new Date('2026-11-05T20:30:00Z');
    expect(formatDate(at)).toBe('6 Nov 2026');
    expect(formatDateTime(at)).toBe('6 Nov 2026, 01:30');
  });
});
