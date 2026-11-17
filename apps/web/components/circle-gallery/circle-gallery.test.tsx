import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SuitCard } from '../../lib/types';
import { CircleGallery } from './circle-gallery';

const suit = (n: number): SuitCard => ({
  id: `s${n}`,
  name: `Suit number ${n}`,
  slug: `suit-${n}`,
  designCode: `DHN-0${n}`,
  price: n === 1 ? 4999 : null,
  compareAtPrice: null,
  pieces: 'three_piece',
  pieceDetails: [{ piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' }],
  collectionType: 'Premium',
  fabric: 'Dhanak',
  mainColor: 'Black',
  colorFamily: 'Black',
  availability: 'in_stock',
  status: 'published',
  featured: false,
  category: { slug: 'dhanak', name: 'Dhanak' },
  image: {
    url: `https://res.cloudinary.com/ma/image/upload/products/s${n}.jpg`,
    alt: `Photo of suit ${n}`,
    width: 1200,
    height: 1600,
  },
});

const SUITS = Array.from({ length: 8 }, (_, i) => suit(i + 1));

// Reduced motion, so every turn of the ring happens at once.
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => vi.unstubAllGlobals());

const details = () => screen.getByTestId('circle-front');

describe('CircleGallery', () => {
  it('links every suit in order, numbered 01 to 08, in a labelled group', () => {
    render(<CircleGallery label="Newest suits" suits={SUITS} />);
    const group = screen.getByRole('group', { name: 'Newest suits' });
    const cards = within(group).getAllByRole('listitem');
    expect(cards).toHaveLength(8);
    cards.forEach((card, i) => {
      const link = within(card).getByRole('link', { name: `Suit number ${i + 1}` });
      expect(link.getAttribute('href')).toBe(`/products/suit-${i + 1}`);
      expect(card.textContent).toContain(String(i + 1).padStart(2, '0'));
      expect(within(card).getByRole('img').getAttribute('alt')).toBe(`Photo of suit ${i + 1}`);
    });
  });

  it('shows the front suit’s details under the ring, starting with the first', () => {
    render(<CircleGallery label="Newest suits" suits={SUITS} />);
    expect(within(details()).getByRole('heading').textContent).toBe('Suit number 1');
    expect(details().textContent).toContain('PKR 4,999');
    expect(
      within(details())
        .getByRole('link', { name: /View Suit/ })
        .getAttribute('href'),
    ).toBe('/products/suit-1');
  });

  it('turns by one suit with Next and Previous', () => {
    render(<CircleGallery label="Newest suits" suits={SUITS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next suit' }));
    expect(within(details()).getByRole('heading').textContent).toBe('Suit number 2');
    fireEvent.click(screen.getByRole('button', { name: 'Previous suit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous suit' }));
    expect(within(details()).getByRole('heading').textContent).toBe('Suit number 8');
  });

  it('brings a card to the front when it gets keyboard focus, so focus is never hidden', () => {
    render(<CircleGallery label="Newest suits" suits={SUITS} />);
    fireEvent.focus(screen.getByRole('link', { name: 'Suit number 5' }));
    expect(within(details()).getByRole('heading').textContent).toBe('Suit number 5');
  });

  it('renders nothing without suits', () => {
    const { container } = render(<CircleGallery label="Newest suits" suits={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
