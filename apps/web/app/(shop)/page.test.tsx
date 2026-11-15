import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ContactStrip,
  FeaturedSuit,
  Hero,
  HowToOrder,
  NewArrivals,
  ShopByFabric,
  Statement,
} from '../../components/home/sections';
import type { Suit } from '../../lib/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('../(account)/account/actions', () => ({ toggleWishlist: vi.fn() }));

describe('home sections', () => {
  it('opens with one large heading, the submark, the fabric picture and the two ways in', () => {
    const art = {
      src: 'https://res.cloudinary.com/ma/image/upload/c_limit/site/home/hero-fabric',
      alt: 'Folded embroidered fabrics',
    };
    render(
      <Hero
        whatsapp="+923482799707"
        collections={['Dhanak', 'Khaddar', 'Lajwanti', 'Lawn']}
        art={art}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Elegant Unstitched Suits, Made for Every Occasion');
    expect(h1.querySelector('.text-accent-text')!.textContent).toBe('Made for Every Occasion');
    expect(screen.getByRole('img', { name: 'MA Apparels' })).toBeTruthy();
    expect(
      decodeURIComponent(screen.getByRole('img', { name: art.alt }).getAttribute('src')!),
    ).toContain('site/home/hero-fabric');
    // The collections come from admin, so a new one never needs a code change.
    expect(document.body.textContent).toContain('suits in Dhanak, Khaddar, Lajwanti and more.');
    expect(screen.getByRole('link', { name: 'See All Suits' }).getAttribute('href')).toBe('/shop');
    expect(screen.getByRole('link', { name: 'WhatsApp Us' }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/923482799707/,
    );
  });

  it('keeps the hero whole with no picture, no collections and no WhatsApp number', () => {
    render(<Hero whatsapp={null} collections={[]} art={null} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      'MA Apparels',
    ]);
    expect(document.body.textContent).toContain('Premium unstitched 2-piece and 3-piece suits.');
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

  it('shows a Shop by Fabric card per collection, each one link with its tagline', () => {
    const cover = {
      url: 'https://res.cloudinary.com/ma/image/upload/products/x/a.jpg',
      alt: 'A suit',
    };
    const make = (slug: string, name: string, description: string | null) =>
      ({ id: slug, slug, name, description, cover }) as Parameters<
        typeof ShopByFabric
      >[0]['collections'][number];
    render(
      <ShopByFabric
        collections={[
          make('dhanak', 'Dhanak', 'Long text'),
          make('khaddar', 'Khaddar', null),
          make('lawn', 'Lawn', 'Light summer suits.'),
        ]}
      />,
    );
    const region = screen.getByRole('region', { name: 'Shop by Fabric' });
    const links = within(region).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/collections/dhanak',
      '/collections/khaddar',
      '/collections/lawn',
    ]);
    expect(links[0]!.textContent).toContain('Soft, warm and perfect for the season.');
    expect(links[1]!.textContent).toContain('A classic fabric with a rich, textured feel.');
    // A collection with no tagline of its own shows its description.
    expect(links[2]!.textContent).toContain('Light summer suits.');
    // The photo is decoration: the card's text names the link.
    expect(within(region).queryAllByRole('img')).toHaveLength(0);
    expect(region.querySelectorAll('img[alt=""]')).toHaveLength(3);
    expect(decodeURIComponent(region.querySelector('img')!.getAttribute('src')!)).toContain(
      'c_fill,g_center,ar_1:1',
    );
  });

  it('leaves Shop by Fabric out when there are no collections', () => {
    const { container } = render(<ShopByFabric collections={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
