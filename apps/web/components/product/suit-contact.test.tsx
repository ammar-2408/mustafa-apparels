import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { emailSubject, whatsappLabel, whatsappText } from '../../lib/inquiry-text';
import type { Suit } from '../../lib/types';
import { StickyWhatsApp, SuitContact } from './suit-contact';

const suit = {
  name: 'Black Embroidered Dhanak 3-Piece Suit',
  slug: 'black-embroidered-dhanak-3-piece-dhn-01',
  designCode: 'DHN-01',
  price: 4999,
  availability: 'in_stock',
} as Suit;

const contact = {
  whatsapp: '+923482799707',
  phone: '+923069558717',
  email: 'shop@example.com',
  delivery: 'Courier delivery across Pakistan in 3 to 5 working days.',
  payment: null,
  replyNote: 'We reply on WhatsApp within a day.',
};

describe('the words the buttons open with', () => {
  it('names the suit, its code, its price and its link', () => {
    expect(whatsappText(suit)).toBe(
      'Hi! I\'m interested in "Black Embroidered Dhanak 3-Piece Suit" (DHN-01, PKR 4,999): https://mustafaapparels.com/products/black-embroidered-dhanak-3-piece-dhn-01',
    );
    expect(emailSubject(suit)).toBe(
      'Question about Black Embroidered Dhanak 3-Piece Suit (DHN-01)',
    );
  });

  it('asks about an out-of-stock suit instead of ordering it', () => {
    const gone = { ...suit, availability: 'out_of_stock' as const };
    expect(whatsappText(gone)).toMatch(
      /^Hi! Will "Black .*" \(DHN-01, PKR 4,999\) be available again\? https:/,
    );
    expect(whatsappLabel(gone)).toBe('Ask about this suit');
    expect(whatsappLabel(suit)).toBe('Order on WhatsApp');
  });

  it('leaves out a missing code and price', () => {
    expect(whatsappText({ ...suit, designCode: null, price: null })).toMatch(
      /^Hi! I'm interested in "Black Embroidered Dhanak 3-Piece Suit": https:/,
    );
  });
});

describe('SuitContact', () => {
  it('puts WhatsApp first, then Call and Email, each about this suit', () => {
    render(<SuitContact suit={suit} contact={contact} />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Order on WhatsApp',
      'Call +92 306 9558717',
      'Email',
    ]);
    expect(links[0]!.getAttribute('href')).toContain('wa.me/923482799707?text=Hi!%20I');
    expect(links[1]!.getAttribute('href')).toBe('tel:+923069558717');
    expect(links[2]!.getAttribute('href')).toMatch(/^mailto:shop@example.com\?subject=Question/);
  });

  it('shows only the notes the owner has written', () => {
    render(<SuitContact suit={suit} contact={contact} />);
    expect(screen.getByText(/Courier delivery across Pakistan/)).toBeTruthy();
    expect(screen.getByText(/We reply on WhatsApp/)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('leaves out buttons for contact details the shop has not set', () => {
    render(
      <SuitContact
        suit={suit}
        contact={{ ...contact, phone: null, email: null, delivery: null, replyNote: null }}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('StickyWhatsApp', () => {
  it('is a phone-only bar, and absent with no WhatsApp number', () => {
    const { container, rerender } = render(<StickyWhatsApp suit={suit} whatsapp="+923482799707" />);
    expect(container.firstElementChild!.className).toContain('lg:hidden');
    expect(screen.getByRole('link', { name: 'Order on WhatsApp' })).toBeTruthy();
    rerender(<StickyWhatsApp suit={suit} whatsapp={null} />);
    expect(container.firstElementChild).toBeNull();
  });
});
