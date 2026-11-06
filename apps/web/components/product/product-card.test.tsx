import type { Card } from '@mustafa/core/products';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import cloudinaryLoader from '../../lib/image-loader';
import { ProductCard } from './product-card';

const suit = (overrides: Partial<Card> = {}): Card => ({
  id: 's1',
  name: 'Black Embroidered Dhanak 3-Piece Suit',
  slug: 'black-embroidered-dhanak-3-piece-dhn-01',
  designCode: 'DHN-01',
  price: 4999,
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
  publishedAt: new Date('2026-11-06'),
  category: { slug: 'dhanak', name: 'Dhanak' },
  image: {
    url: 'https://res.cloudinary.com/ma/image/upload/products/imported/DHN-01/dhn-01.jpg',
    alt: 'Model wearing a black 3-piece Dhanak suit',
    width: 1256,
    height: 2300,
  },
  ...overrides,
});

// jsdom has no showModal(); the browser's own dialog is covered by the menu E2E.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
});

describe('ProductCard', () => {
  it('links the photo, finish and fabric, name, pieces and price to the suit page', () => {
    render(<ProductCard suit={suit()} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/products/black-embroidered-dhanak-3-piece-dhn-01');
    expect(link.textContent).toContain('Embroidered · Dhanak');
    expect(link.textContent).toContain('3 Piece');
    expect(link.textContent).toContain('PKR 4,999');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
      'Black Embroidered Dhanak 3-Piece Suit',
    );
  });

  it('asks Cloudinary for a 3:4 crop from the top, at grid widths', () => {
    render(<ProductCard suit={suit()} />);
    const img = screen.getByRole('img', { name: 'Model wearing a black 3-piece Dhanak suit' });
    // Vitest doesn't read next.config's loaderFile, so check the shaped URL and the loader apart.
    const shaped = new URL(img.getAttribute('src')!, 'http://x').searchParams.get('url')!;
    expect(shaped).toContain('/image/upload/c_fill,g_north,ar_3:4/');
    expect(cloudinaryLoader({ src: shaped, width: 384 })).toContain(
      '/image/upload/c_fill,g_north,ar_3:4,w_384,f_auto,q_auto/',
    );
    expect(img.getAttribute('sizes')).toContain('50vw');
  });

  it('shows a higher compare-at price struck through, and never a lower one', () => {
    const { rerender } = render(<ProductCard suit={suit({ compareAtPrice: 6500 })} />);
    expect(screen.getByText('PKR 6,500').closest('s')).toBeTruthy();
    rerender(<ProductCard suit={suit({ compareAtPrice: 4000 })} />);
    expect(screen.queryByText('PKR 4,000')).toBeNull();
  });

  it('says when a suit is out of stock, and nothing when it is in stock', () => {
    const { rerender } = render(<ProductCard suit={suit({ availability: 'out_of_stock' })} />);
    expect(screen.getByText('Out of stock')).toBeTruthy();
    rerender(<ProductCard suit={suit()} />);
    expect(screen.queryByText(/stock/i)).toBeNull();
  });

  it('copes with a suit that has no photo yet, and never shows a video', () => {
    const { container } = render(<ProductCard suit={suit({ image: null })} />);
    expect(screen.getByText('Photo coming soon')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });

  it('asks a guest to log in when they tap the heart', () => {
    render(<ProductCard suit={suit()} />);
    const heart = screen.getByRole('button', {
      name: 'Save Black Embroidered Dhanak 3-Piece Suit',
    });
    expect(heart.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(heart);
    expect(screen.getByRole('link', { name: 'Log in', hidden: true }).getAttribute('href')).toBe(
      '/login',
    );
  });
});
