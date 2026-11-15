import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { About, Hero, HowToOrder, NewArrivals } from '../../components/home/sections';

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

  it('states the plain facts about the shop as one sentence, with three points and the picture', () => {
    const art = {
      src: 'https://res.cloudinary.com/ma/image/upload/c_limit/site/home/about-fabric',
      alt: 'Fabrics',
    };
    render(<About art={art} />);
    const region = screen.getByRole('region', { name: /^Mustafa Apparels is an online shop/ });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan.',
    );
    expect(region.textContent).toContain('every order is arranged with you on WhatsApp');
    expect(
      within(region)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Women’s SuitsElegant collections',
      'Premium FabricsCarefully selected',
      'Order on WhatsAppQuick & convenient',
    ]);
    expect(within(region).getByRole('img', { name: 'Fabrics' })).toBeTruthy();
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
      </>,
    );
    expect(container.innerHTML).toBe('');
  });
});
