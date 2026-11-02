import { describe, expect, it } from 'vitest';

import { SETTING_KEYS, settingInput } from './settings';

const ok = (key: string, value: unknown) => settingInput.safeParse({ key, value });

describe('SETTING_KEYS', () => {
  it('lists the keys in docs/database.md §2, with no address or opening hours', () => {
    expect([...SETTING_KEYS]).toEqual([
      'shop_name',
      'phone',
      'whatsapp',
      'email',
      'service_area',
      'delivery_info',
      'payment_info',
      'return_policy',
      'reply_note',
      'socials',
      'default_seo',
    ]);
  });
});

describe('settingInput', () => {
  it('stores phone numbers as E.164', () => {
    expect(settingInput.parse({ key: 'whatsapp', value: '0348 2799707' })).toEqual({
      key: 'whatsapp',
      value: '+923482799707',
    });
    expect(ok('phone', '0306-9558717').data?.value).toBe('+923069558717');
  });

  it('stores the email lower case', () => {
    expect(ok('email', 'AmmarOfficial321@gmail.com').data?.value).toBe(
      'ammarofficial321@gmail.com',
    );
  });

  it.each([
    ['shop_name', 'Mustafa Apparels'],
    ['service_area', 'Pakistan'],
    ['delivery_info', 'Courier across Pakistan in 3–5 working days.'],
    ['payment_info', 'Cash on delivery or bank transfer.'],
    ['return_policy', 'Unstitched fabric can be exchanged within 7 days if uncut.'],
    ['reply_note', 'We reply on WhatsApp within a few hours.'],
    ['socials', { instagram: 'https://www.instagram.com/mustafaapparels' }],
    ['socials', {}],
    ['default_seo', { title: 'Mustafa Apparels', description: 'Unstitched suits.' }],
  ])('accepts a valid %s', (key, value) => {
    expect(ok(key, value).success).toBe(true);
  });

  it.each([
    ['phone', '042 35761234'],
    ['whatsapp', ''],
    ['email', 'not-an-email'],
    ['shop_name', 'M'],
    ['shop_name', 'Khaadi Outlet'],
    ['service_area', 'Pakistan, like Nishat'],
    ['delivery_info', 'a'.repeat(1001)],
    ['reply_note', 'a'.repeat(201)],
    ['payment_info', 42],
    ['socials', { instagram: 'http://www.instagram.com/x' }],
    ['socials', { instagram: 'https://evil.example.com/x' }],
    ['socials', { myspace: 'https://myspace.com/x' }],
    ['default_seo', { title: 'a'.repeat(61), description: 'x' }],
    ['default_seo', { title: 'Maria B suits', description: 'x' }],
    ['address', 'Lahore'],
    ['opening_hours', '9–5'],
  ])('rejects %s = %j', (key, value) => {
    expect(ok(key, value).success).toBe(false);
  });
});
