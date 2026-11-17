import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  DM_Serif_Display: () => ({ variable: 'font-dm-serif-var', className: 'dm-serif' }),
}));

import { CollectionHero } from './collection-hero';

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'All suits', path: '/shop' },
  { name: 'Dhanak', path: '/collections/dhanak' },
];

describe('CollectionHero', () => {
  it('shows the breadcrumb, the name in the serif, the text and the count, as in the template', () => {
    render(
      <CollectionHero
        name="Dhanak"
        description="Unstitched Dhanak suits for winter."
        crumbs={crumbs}
        total={12}
        page={1}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/');
    expect(within(nav).getByRole('link', { name: 'All suits' }).getAttribute('href')).toBe('/shop');
    expect(within(nav).getByText('Dhanak').getAttribute('aria-current')).toBe('page');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Dhanak');
    expect(h1.className).toContain('font-serif');
    expect(document.body.textContent).toContain('Unstitched Dhanak suits for winter.');
    expect(screen.getByText('12 suits')).toBeTruthy();
    // The fabric picture is decoration: no alt text, hidden from screen readers.
    const picture = document.querySelector('img')!;
    expect(picture.getAttribute('alt')).toBe('');
    expect(picture.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('says "1 suit", shows the page number after page 1, and copes with no description', () => {
    render(<CollectionHero name="Lawn" description={null} crumbs={crumbs} total={1} page={2} />);
    expect(screen.getByText('1 suit')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('LawnPage 2');
  });
});
