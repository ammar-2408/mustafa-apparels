import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

import { AdminNav, isCurrent } from './admin-nav';

const renderNav = (pathname: string) => {
  nav.pathname = pathname;
  return render(<AdminNav mobileLogo={<span>logo</span>} footer={<span>footer</span>} />);
};

describe('isCurrent', () => {
  it('marks the dashboard only on the home page', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/suits', '/')).toBe(false);
  });

  it('marks a section on its own page and the pages under it, not on look-alikes', () => {
    expect(isCurrent('/suits', '/suits')).toBe(true);
    expect(isCurrent('/suits/abc', '/suits')).toBe(true);
    expect(isCurrent('/suitsx', '/suits')).toBe(false);
  });
});

describe('AdminNav', () => {
  it('lists every admin section and marks the current one', () => {
    renderNav('/suits/abc');
    const links = screen.getAllByRole('link').map((link) => link.textContent);
    expect(links).toEqual([
      'Dashboard',
      'Suits',
      'Collections',
      'Inquiries',
      'Customers',
      'Settings',
      'Audit log',
    ]);
    expect(screen.getByRole('link', { name: 'Suits' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBeNull();
  });

  it('opens and closes the phone menu, saying which it is', () => {
    renderNav('/');
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('admin-menu');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('closes the phone menu after moving to another page', () => {
    const { rerender } = renderNav('/');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    nav.pathname = '/suits';
    rerender(<AdminNav mobileLogo={<span>logo</span>} footer={<span>footer</span>} />);
    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
});
