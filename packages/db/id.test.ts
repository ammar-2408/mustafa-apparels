import { describe, expect, it } from 'vitest';

import { uuidv7 } from './id';

describe('uuidv7', () => {
  it('returns a version 7, RFC 9562 variant UUID', () => {
    expect(uuidv7()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('puts the timestamp first, so later ids sort after earlier ones', () => {
    const ids = [1_700_000_000_000, 1_700_000_000_001, 1_800_000_000_000].map((ms) => uuidv7(ms));
    expect([...ids].sort()).toEqual(ids);
    expect(ids[0]!.replaceAll('-', '').slice(0, 12)).toBe(
      (1_700_000_000_000).toString(16).padStart(12, '0'),
    );
  });

  it('differs between two calls in the same millisecond', () => {
    expect(uuidv7(1)).not.toBe(uuidv7(1));
  });
});
