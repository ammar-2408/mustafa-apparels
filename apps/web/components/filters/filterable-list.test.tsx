import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({ value: 'design=embroidered' }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(query.value),
  usePathname: () => '/shop',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('../../app/(account)/account/actions', () => ({ toggleWishlist: vi.fn() }));

import type { Facets, FilterSuit } from '../../lib/filters';
import { FilterableList } from './filterable-list';

const facets: Facets = {
  pieces: ['two_piece', 'three_piece'],
  dressCategories: ['Unstitched Suits'],
  fabric: ['Dhanak'],
  design: ['Embroidered', 'Floral Print'],
  season: ['winter'],
  outfitStyle: [],
  colorFamily: ['Black'],
  priceBands: ['4000-6000'],
};

const suit = (id: string, design: string[]): FilterSuit =>
  ({
    id,
    slug: id,
    name: `Suit ${id}`,
    price: 4999,
    compareAtPrice: null,
    pieces: 'three_piece',
    pieceDetails: [],
    fabric: 'Dhanak',
    design,
    dressCategories: ['Unstitched Suits'],
    season: 'winter',
    outfitStyle: null,
    colorFamily: 'Black',
    availability: 'in_stock',
    category: { slug: 'dhanak', name: 'Dhanak' },
    image: null,
  }) as unknown as FilterSuit;

const serverGrid = <p>The server grid</p>;

beforeEach(() => {
  query.value = 'design=embroidered';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FilterableList', () => {
  it('shows the server grid and fetches nothing while no filter is chosen', () => {
    query.value = '';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<FilterableList facets={facets}>{serverGrid}</FilterableList>);
    expect(screen.getByText('The server grid')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('when the suits fail to load, says so and keeps every suit on show, then tries again', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ suits: [suit('a', ['Embroidered']), suit('b', ['Floral Print'])] }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    render(<FilterableList facets={facets}>{serverGrid}</FilterableList>);

    expect((await screen.findByRole('alert')).textContent).toContain('couldn’t load');
    expect(screen.getByText('The server grid')).toBeTruthy();
    expect(screen.queryByText(/suits? match/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('1 suit match')).toBeTruthy());
    expect(screen.queryByText('The server grid')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows the quick chips as pills with an icon each, the chosen one in deep green', () => {
    query.value = '';
    vi.stubGlobal('fetch', vi.fn());
    render(<FilterableList facets={facets}>{serverGrid}</FilterableList>);
    const group = screen.getByRole('group', { name: 'Quick filters' });
    const chips = Array.from(group.querySelectorAll('button'));
    expect(chips.length).toBeGreaterThan(2);
    for (const chip of chips) {
      // Every value gets a drawing, new ones from admin too, hidden from screen readers.
      expect(chip.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(chip.className).toContain('rounded-full');
    }
    const embroidered = screen.getByRole('button', { name: 'Embroidered' });
    expect(embroidered.className).toContain('aria-pressed:bg-deep');
    expect(screen.getByRole('button', { name: 'Filters' }).querySelector('svg')).not.toBeNull();
  });
});
