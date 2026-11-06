import { describe, expect, it } from 'vitest';

import { newInquiry } from './email-templates';

const base = {
  name: 'Ayesha',
  phone: '+923001234567',
  message: 'Is this <b>in stock</b>?',
  inboxUrl: 'https://admin.mustafaapparels.com/inquiries',
};

describe('newInquiry', () => {
  it('names the suit, the shopper and how to reach them, with a link to the inbox', () => {
    const mail = newInquiry({
      ...base,
      email: 'ayesha@example.com',
      suit: {
        name: 'Black Embroidered Dhanak 3-Piece Suit',
        designCode: 'DHN-01',
        url: 'https://mustafaapparels.com/products/black-embroidered-dhanak-3-piece-dhn-01',
      },
    });
    expect(mail.subject).toBe('New question about Black Embroidered Dhanak 3-Piece Suit (DHN-01)');
    expect(mail.text).toContain('Phone or WhatsApp: +923001234567');
    expect(mail.text).toContain('Email: ayesha@example.com');
    expect(mail.text).toContain('Open the inbox: https://admin.mustafaapparels.com/inquiries');
  });

  it('escapes what the shopper typed in the HTML', () => {
    const mail = newInquiry({ ...base, suit: null });
    expect(mail.subject).toBe('New question from Ayesha');
    expect(mail.html).toContain('Is this &lt;b&gt;in stock&lt;/b&gt;?');
    expect(mail.html).not.toContain('<b>in stock</b>');
    expect(mail.text).not.toContain('Email:');
  });
});
