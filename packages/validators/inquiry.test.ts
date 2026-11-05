import { describe, expect, it } from 'vitest';

import { inquiryInput, inquiryListInput, inquiryStatusInput } from './inquiry';

const guest = { name: 'Ayesha', phone: '0300 1234567', message: 'Is DHN-01 in stock?' };

const errorsOf = (input: unknown) => {
  const result = inquiryInput.safeParse(input);
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe('inquiryInput', () => {
  it('accepts a guest with a phone, and stores it as E.164', () => {
    expect(inquiryInput.parse(guest)).toEqual({ ...guest, phone: '+923001234567' });
  });

  it('accepts an email instead of a phone, stored lower case', () => {
    const emailOnly = { name: guest.name, message: guest.message, email: ' Ayesha@Example.PK ' };
    expect(inquiryInput.parse(emailOnly).email).toBe('ayesha@example.pk');
  });

  it('accepts a question about a suit, from a form that sends blanks', () => {
    const parsed = inquiryInput.parse({ ...guest, productId: 'p1', email: '', website: '' });
    expect(parsed).toMatchObject({ productId: 'p1' });
    expect(parsed.email).toBeUndefined();
  });

  it('needs a phone or an email', () => {
    expect(errorsOf({ name: 'Ayesha', message: 'Hi', phone: '', email: '' })).toEqual({
      phone: ['Add a phone number or an email'],
    });
  });

  it.each([
    ['a one-letter name', { name: 'A' }, 'name'],
    ['an 81-letter name', { name: 'a'.repeat(81) }, 'name'],
    ['an empty message', { message: '   ' }, 'message'],
    ['a 2,001-character message', { message: 'a'.repeat(2001) }, 'message'],
    ['a landline', { phone: '042 35761234' }, 'phone'],
    ['a bad email', { email: 'ayesha@' }, 'email'],
    ['a filled honeypot', { website: 'https://spam.example' }, 'website'],
  ])('rejects %s', (_, change, field) => {
    expect(Object.keys(errorsOf({ ...guest, ...change }))).toEqual([field]);
  });

  it('accepts a 2,000-character message', () => {
    expect(inquiryInput.safeParse({ ...guest, message: 'a'.repeat(2000) }).success).toBe(true);
  });

  it('rejects fields the form never sends, such as a user id', () => {
    expect(inquiryInput.safeParse({ ...guest, userId: 'u1' }).success).toBe(false);
  });
});

describe('inquiry admin inputs', () => {
  it('moves an inquiry to a known status only', () => {
    expect(inquiryStatusInput.safeParse({ id: 'i1', status: 'contacted' }).success).toBe(true);
    expect(inquiryStatusInput.safeParse({ id: 'i1', status: 'spam' }).success).toBe(false);
    expect(inquiryStatusInput.safeParse({ id: 'i1', status: 'closed', message: 'x' }).success).toBe(
      false,
    );
  });

  it('opens the inbox on new inquiries, page 1', () => {
    expect(inquiryListInput.parse({})).toEqual({ status: 'new', page: 1 });
    expect(inquiryListInput.parse({ status: 'closed', page: '3' })).toEqual({
      status: 'closed',
      page: 3,
    });
    expect(inquiryListInput.safeParse({ status: 'all' }).success).toBe(false);
  });
});
