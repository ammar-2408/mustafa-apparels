import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  About,
  ExploreCollections,
  Hero,
  HowToOrder,
  NewArrivals,
} from '../../components/home/sections';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('../(account)/account/actions', () => ({ toggleWishlist: vi.fn() }));

describe('home sections', () => {
  it('is centred: the submark, the shop name, one large heading and two deep green buttons', () => {
    render(<Hero whatsapp="+923482799707" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Elegant Unstitched Suits, Made for Every Occasion');
    expect(h1.querySelector('.text-accent-text')!.textContent).toBe('Made for Every Occasion');
    // No picture any more (owner's finalhero.png, 2026-11-15): only the MA submark.
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      'MA Apparels',
    ]);
    expect(screen.getByText('Mustafa Apparels')).toBeTruthy();
    // The owner's own words (2026-11-17).
    expect(document.body.textContent).toContain(
      'Your next favourite outfit starts here. Discover our premium collection of unstitched suits, designer wear, and fancy ensembles, featuring exquisite fabrics, timeless designs, and elegant detailing. Shop your favourite styles, place your order through WhatsApp, and enjoy doorstep delivery anywhere in Pakistan.',
    );
    const all = screen.getByRole('link', { name: 'See All Suits' });
    expect(all.getAttribute('href')).toBe('/shop');
    expect(all.className).toContain('bg-deep');
    const whatsapp = screen.getByRole('link', { name: 'WhatsApp Us' });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/923482799707/);
    expect(whatsapp.className).toContain('border-deep');
  });

  it('keeps the hero whole with no collections and no WhatsApp number', () => {
    render(<Hero whatsapp={null} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'WhatsApp Us' })).toBeNull();
    expect(screen.getByRole('link', { name: 'See All Suits' })).toBeTruthy();
  });

  it('states the plain facts about the shop as one sentence, with three points and the picture', () => {
    const art = {
      src: 'https://res.cloudinary.com/ma/image/upload/c_limit/site/home/about-boutique',
      alt: 'Fabrics',
    };
    render(<About art={art} />);
    const region = screen.getByRole('region', { name: /^Mustafa Apparels is an online shop/ });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan.',
    );
    // The owner's Boutique Showcase mockup (2026-11-17).
    expect(region.textContent).toContain(
      'Premium unstitched fabrics, elegant designs, and timeless styles for every occasion.',
    );
    expect(
      within(region)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Nationwide DeliveryAcross Pakistan',
      'Premium FabricsQuality You Can Trust',
      'Elegant DesignsFor Every Occasion',
    ]);
    expect(within(region).getByRole('img', { name: 'Fabrics' })).toBeTruthy();
  });

  it('lists how to order as three numbered steps, each with its next move', () => {
    render(<HowToOrder whatsapp="+923482799707" />);
    const region = screen.getByRole('region', { name: 'How to Order' });
    const steps = within(within(region).getByRole('list')).getAllByRole('listitem');
    expect(steps.map((s) => s.querySelector('h3')!.textContent)).toEqual([
      'Choose a suit',
      'Send it to us on WhatsApp',
      'Courier delivery',
    ]);
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining('Step 1'),
      expect.stringContaining('Step 2'),
      expect.stringContaining('Step 3'),
    ]);
    expect(
      within(steps[0]!)
        .getByRole('link', { name: /Browse Collections/ })
        .getAttribute('href'),
    ).toBe('#collections');
    expect(
      within(steps[1]!)
        .getByRole('link', { name: /Order on WhatsApp/ })
        .getAttribute('href'),
    ).toMatch(/^https:\/\/wa\.me\/923482799707/);
    // No tracking page exists, so the third step asks on WhatsApp (owner, 2026-11-15).
    const ask = within(steps[2]!).getByRole('link', { name: /Ask on WhatsApp/ });
    expect(decodeURIComponent(ask.getAttribute('href')!)).toContain('delivery');
    expect(region.textContent).not.toMatch(/Track/);
  });

  it('keeps How to Order without its WhatsApp links when no number is set', () => {
    render(<HowToOrder whatsapp={null} />);
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      expect.stringContaining('Browse Collections'),
    ]);
    const { container } = render(<NewArrivals suits={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('Explore Our Collections', () => {
  const cover = {
    url: 'https://res.cloudinary.com/ma/image/upload/products/x/a.jpg',
    alt: 'A suit',
  };
  const make = (slug: string, name: string, description: string | null) =>
    ({ id: slug, slug, name, description, cover }) as Parameters<
      typeof ExploreCollections
    >[0]['collections'][number];

  it('shows a card per collection from admin, a new one included, each linking to its page', () => {
    render(
      <ExploreCollections
        collections={[
          make('dhanak', 'Dhanak', 'Unstitched Dhanak suits for winter.'),
          make('khaddar', 'Khaddar', null),
          make('lawn', 'Lawn', 'Light summer suits.'),
        ]}
      />,
    );
    const region = screen.getByRole('region', { name: 'Explore Our Collections' });
    const links = within(region).getAllByRole('link', { name: /See the collection/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/collections/dhanak',
      '/collections/khaddar',
      '/collections/lawn',
    ]);
    expect(
      within(region)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Dhanak', 'Khaddar', 'Lawn']);
    expect(region.textContent).toContain('Light summer suits.');
    expect(decodeURIComponent(region.querySelector('img')!.getAttribute('src')!)).toContain(
      'c_fill,g_north,ar_4:3',
    );
  });

  it('is left out when there are no collections', () => {
    const { container } = render(<ExploreCollections collections={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
