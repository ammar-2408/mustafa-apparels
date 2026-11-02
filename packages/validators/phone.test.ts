import { describe, expect, it } from 'vitest';

import { pkMobile, toPkMobile } from './phone';

describe('toPkMobile', () => {
  it.each([
    ['03482799707', '+923482799707'],
    ['0348 2799707', '+923482799707'],
    ['0348-279-9707', '+923482799707'],
    ['+92 348 2799707', '+923482799707'],
    ['+923482799707', '+923482799707'],
    ['923482799707', '+923482799707'],
    ['00923482799707', '+923482799707'],
    ['(0348) 2799707', '+923482799707'],
  ])('reads %s as %s', (raw, e164) => {
    expect(toPkMobile(raw)).toBe(e164);
  });

  it.each([
    ['a landline', '042 35761234'],
    ['too short', '0348279970'],
    ['too long', '034827997070'],
    ['another country', '+44 7700 900123'],
    ['letters', '0348-CALL-NOW'],
    ['empty', ''],
  ])('rejects %s', (_, raw) => {
    expect(toPkMobile(raw)).toBeNull();
  });
});

describe('pkMobile schema', () => {
  it('outputs E.164', () => {
    expect(pkMobile.parse(' 0306 9558717 ')).toBe('+923069558717');
  });

  it('explains a wrong number', () => {
    const result = pkMobile.safeParse('12345');
    expect(result.error?.issues[0]?.message).toBe(
      'Enter a Pakistani mobile number, like 0300 1234567',
    );
  });
});
