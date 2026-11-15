import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ContactStrip,
  FeaturedSuit,
  Hero,
  HowToOrder,
  NewArrivals,
  Statement,
} from '../../components/home/sections';
import type { Suit } from '../../lib/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('../(account)/account/actions', () => ({ toggleWishlist: vi.fn() }));

describe('home sections', () => {
  it('opens with one large heading, the submark, a suit photo and the two ways in', () => {
    const photo = {
      url: 'https://res.cloudinary.com/ma/image/upload/products/x/teal.jpg',
      alt: 'Teal embroidered Khaddar suit',
    };
    render(<Hero whatsapp="+923482799707" photo={photo} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Elegant Unstitched Suits, Made for Every Occasion');
    expect(h1.querySelector('.text-accent-text')!.textContent).toBe('Made for Every Occasion');
    expect(screen.getByRole('img', { name: 'MA Apparels' })).toBeTruthy();
    const image = screen.getByRole('img', { name: photo.alt });
    expect(decodeURIComponent(image.getAttribute('src')!)).toContain('c_fill,g_north,ar_4:5');
    expect(screen.getByRole('link', { name: 'See All Suits' }).getAttribute('href')).toBe('/shop');
    expect(screen.getByRole('link', { name: 'WhatsApp Us' }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/923482799707/,
    );
  });

  it('keeps the hero whole with no photo and no WhatsApp number', () => {
    render(<Hero whatsapp={null} photo={null} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      'MA Apparels',
    ]);
    expect(screen.queryByRole('link', { name: 'WhatsApp Us' })).toBeNull();
  });

  it('states the plain facts about the shop', () => {
    render(<Statement />);
    expect(document.body.textContent).toContain(
      'online shop for women’s unstitched suits in Pakistan',
    );
  });

  it('lists how to order as three steps in order, and leaves empty parts out', () => {
    render(<HowToOrder />);
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((s) => s.querySelector('h3')!.textContent)).toEqual([
      'Choose a suit',
      'Send it to us on WhatsApp',
      'Courier delivery',
    ]);
    const { container } = render(
      <>
        <NewArrivals suits={[]} />
        <FeaturedSuit suit={null} />
        <ContactStrip contact={{ whatsapp: null, phone: null, email: null }} />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('features a suit with its photo when it has no video', () => {
    const suit = {
      name: 'Teal Embroidered Khaddar 3-Piece Suit',
      slug: 'teal-embroidered-khaddar-3-piece-kdr-05',
      pieces: 'three_piece',
      price: 4999,
      description: 'A teal unstitched 3-piece Khaddar suit for winter.',
      category: { slug: 'khaddar', name: 'Khaddar' },
      media: [
        {
          id: 'm1',
          kind: 'image',
          url: 'https://res.cloudinary.com/ma/image/upload/products/kdr-05.jpg',
          publicId: 'products/kdr-05',
          alt: 'Model in a teal Khaddar suit',
          width: 1000,
          height: 2000,
          durationSeconds: null,
          posterPublicId: null,
        },
      ],
    } as Suit;
    render(<FeaturedSuit suit={suit} />);
    expect(screen.getByRole('img', { name: 'Model in a teal Khaddar suit' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See this suit' }).getAttribute('href')).toBe(
      '/products/teal-embroidered-khaddar-3-piece-kdr-05',
    );
    expect(document.querySelector('video')).toBeNull();
  });
});
