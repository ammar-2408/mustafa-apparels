import { describe, expect, it } from 'vitest';

import { mailtoLink, telLink, whatsappLink } from './contact-links';

describe('contact links', () => {
  it('builds a wa.me link from an E.164 number, with the text encoded', () => {
    expect(whatsappLink('+923482799707')).toBe('https://wa.me/923482799707');
    expect(whatsappLink('+923482799707', 'Hi! "KDR-13" & price?')).toBe(
      'https://wa.me/923482799707?text=Hi!%20%22KDR-13%22%20%26%20price%3F',
    );
  });

  it('builds a tel link with the plus sign', () => {
    expect(telLink('+923069558717')).toBe('tel:+923069558717');
  });

  it('builds a mailto link with spaces as %20', () => {
    expect(mailtoLink('ayesha@example.com')).toBe('mailto:ayesha@example.com');
    expect(mailtoLink('ayesha@example.com', 'Your inquiry', 'Hi Ayesha, thanks')).toBe(
      'mailto:ayesha@example.com?subject=Your%20inquiry&body=Hi%20Ayesha%2C%20thanks',
    );
  });
});
