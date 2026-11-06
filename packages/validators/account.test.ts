import { describe, expect, it } from 'vitest';

import { deleteAccountInput, profileInput, wishlistInput } from './account';

describe('account inputs', () => {
  it('saves or removes one suit, and never takes a user id', () => {
    expect(wishlistInput.parse({ productId: 'p1', saved: true })).toEqual({
      productId: 'p1',
      saved: true,
    });
    expect(wishlistInput.safeParse({ productId: 'p1', saved: true, userId: 'u2' }).success).toBe(
      false,
    );
  });

  it('reads a name and a Pakistani mobile, or a blank to remove it', () => {
    expect(profileInput.parse({ name: ' Ayesha ', phone: '0300 1234567' })).toEqual({
      name: 'Ayesha',
      phone: '+923001234567',
    });
    expect(profileInput.parse({ name: 'Ayesha', phone: '' })).toEqual({
      name: 'Ayesha',
      phone: null,
    });
    expect(profileInput.safeParse({ name: 'A', phone: '' }).success).toBe(false);
    expect(profileInput.safeParse({ name: 'Ayesha', phone: '042 35761234' }).success).toBe(false);
  });

  it('needs DELETE typed exactly and the password', () => {
    expect(deleteAccountInput.safeParse({ confirm: 'DELETE', password: 'x' }).success).toBe(true);
    for (const confirm of ['delete', 'DELETE ', '']) {
      expect(deleteAccountInput.safeParse({ confirm, password: 'x' }).success).toBe(false);
    }
    expect(deleteAccountInput.safeParse({ confirm: 'DELETE', password: '' }).success).toBe(false);
  });
});
