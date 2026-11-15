import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MainNav } from './main-nav';

const collections = [
  { href: '/collections/dhanak', label: 'Dhanak' },
  { href: '/collections/khaddar', label: 'Khaddar' },
  { href: '/collections/lawn', label: 'Lawn' },
];

describe('MainNav', () => {
  it('has Home, a Collections button and All Suits, marking the page you are on', () => {
    render(<MainNav collections={collections} pathname="/" />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'All Suits' }).getAttribute('href')).toBe('/shop');
    const button = within(nav).getByRole('button', { name: 'Collections' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    // The collections stay out of the bar itself, so new ones never make it too long.
    expect(within(nav).queryByRole('link', { name: 'Dhanak' })).toBeNull();
  });

  it('opens a list of every collection, and closes it on Esc with focus back on the button', () => {
    render(<MainNav collections={collections} pathname="/collections/khaddar" />);
    const button = screen.getByRole('button', { name: 'Collections' });
    expect(button.getAttribute('data-active')).toBe('true');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('list', { name: 'Collections' });
    expect(
      within(list)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Dhanak', 'Khaddar', 'Lawn']);
    expect(within(list).getByRole('link', { name: 'Khaddar' }).getAttribute('aria-current')).toBe(
      'page',
    );
    fireEvent.keyDown(list, { key: 'Escape' });
    expect(screen.queryByRole('list', { name: 'Collections' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes the list on a click outside it', () => {
    render(
      <>
        <MainNav collections={collections} pathname="/shop" />
        <p>Outside</p>
      </>,
    );
    expect(screen.getByRole('link', { name: 'All Suits' }).getAttribute('aria-current')).toBe(
      'page',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Collections' }));
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(screen.queryByRole('list', { name: 'Collections' })).toBeNull();
  });
});
