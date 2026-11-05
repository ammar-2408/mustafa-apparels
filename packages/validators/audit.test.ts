import { describe, expect, it } from 'vitest';

import { auditListInput } from './audit';

describe('auditListInput', () => {
  it('reads optional entity and actor filters and a page', () => {
    expect(auditListInput.parse({})).toEqual({ page: 1 });
    expect(auditListInput.parse({ entity: 'product', actor: 'u1', page: '2' })).toEqual({
      entity: 'product',
      actor: 'u1',
      page: 2,
    });
  });

  it('refuses an unknown entity or filter', () => {
    expect(auditListInput.safeParse({ entity: 'user' }).success).toBe(false);
    expect(auditListInput.safeParse({ action: 'x' }).success).toBe(false);
  });
});
