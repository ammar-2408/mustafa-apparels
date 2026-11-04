import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeaderLogo } from './logo';

describe('HeaderLogo', () => {
  it('links home with the shop name', () => {
    render(<HeaderLogo />);
    const link = screen.getByRole('link', { name: 'Mustafa Apparels home' });
    expect(link.getAttribute('href')).toBe('/');
  });

  // One of the three shows at a time: submark on phones, secondary from md, larger from lg.
  const headerLogos = () => {
    render(<HeaderLogo />);
    const [submark, tablet, desktop] = screen.getAllByRole('img', { hidden: true });
    return { submark: submark!, tablet: tablet!, desktop: desktop! };
  };
  const classes = (el: HTMLElement) => el.className.split(' ');

  it('shows the submark at 32px on phones', () => {
    const { submark } = headerLogos();
    expect(submark.getAttribute('src')).toMatch(/submark-black\.svg$/);
    expect(classes(submark)).toContain('md:hidden');
    expect(submark.style.height).toBe('32px');
  });

  it('shows the secondary logo at 48px from md to lg', () => {
    const { tablet } = headerLogos();
    expect(tablet.getAttribute('src')).toMatch(/secondary-black\.svg$/);
    expect(classes(tablet)).toEqual(expect.arrayContaining(['hidden', 'md:block', 'lg:hidden']));
    expect(tablet.style.height).toBe('48px');
  });

  it('shows the secondary logo at 64px from lg up', () => {
    const { desktop } = headerLogos();
    expect(desktop.getAttribute('src')).toMatch(/secondary-black\.svg$/);
    expect(classes(desktop)).toEqual(expect.arrayContaining(['hidden', 'lg:block']));
    expect(desktop.style.height).toBe('64px');
  });

  it('loads every header logo eagerly', () => {
    for (const logo of Object.values(headerLogos())) {
      expect(logo.getAttribute('loading')).not.toBe('lazy');
    }
  });
});
