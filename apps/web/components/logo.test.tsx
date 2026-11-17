import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeaderLogo } from './logo';

// The full secondary logo on every screen, so "APPARELS · BY MUSTAFA AHMED" can be read (owner,
// 2026-11-17): 48px on phones, 64px from md, 72px from lg, 80px from xl. It is the SVG, so it
// stays sharp at any size and pixel density.
const SIZES = [
  { classes: ['md:hidden'], height: '48px' },
  { classes: ['hidden', 'md:block', 'lg:hidden'], height: '64px' },
  { classes: ['hidden', 'lg:block', 'xl:hidden'], height: '72px' },
  { classes: ['hidden', 'xl:block'], height: '80px' },
];

describe('HeaderLogo', () => {
  it('links home with the shop name', () => {
    render(<HeaderLogo />);
    const link = screen.getByRole('link', { name: 'Mustafa Apparels home' });
    expect(link.getAttribute('href')).toBe('/');
  });

  it('shows the full secondary logo at each size, one per breakpoint', () => {
    render(<HeaderLogo />);
    const logos = screen.getAllByRole('img', { hidden: true });
    expect(logos).toHaveLength(SIZES.length);
    logos.forEach((logo, i) => {
      expect(logo.getAttribute('src')).toMatch(/secondary-black\.svg$/);
      expect(logo.className.split(' ')).toEqual(expect.arrayContaining(SIZES[i]!.classes));
      expect(logo.style.height).toBe(SIZES[i]!.height);
      expect(logo.getAttribute('loading')).not.toBe('lazy');
    });
  });
});
