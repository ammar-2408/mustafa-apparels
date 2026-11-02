import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  HeaderLogo,
  Logo,
  LOGO_MIN_HEIGHT,
  LOGO_RATIO,
  type LogoColour,
  type LogoVariant,
} from './logo';

const VARIANTS: LogoVariant[] = ['primary', 'secondary', 'simplified', 'submark'];
const FULL_NAME = 'MA Apparels by Mustafa Ahmed';
const SHORT_NAME = 'MA Apparels';

const viewBoxRatio = (variant: LogoVariant) => {
  // jsdom's URL can't resolve file paths, so build the path directly.
  const file = join(
    import.meta.dirname,
    `../public/brand/svg/mustafa-apparels-${variant}-black.svg`,
  );
  const [, , width, height] = readFileSync(file, 'utf8')
    .match(/viewBox="([^"]+)"/)![1]!
    .split(/\s+/)
    .map(Number);
  return width! / height!;
};

const img = () => screen.getByRole('img');

describe('Logo', () => {
  it.each([
    ['primary', FULL_NAME],
    ['secondary', FULL_NAME],
    ['simplified', SHORT_NAME],
    ['submark', SHORT_NAME],
  ] as const)('names the %s logo "%s"', (variant, alt) => {
    render(<Logo variant={variant} />);
    expect(img().getAttribute('alt')).toBe(alt);
  });

  const FILES = VARIANTS.flatMap((variant) =>
    (['black', 'white'] as const).map((colour): [LogoVariant, LogoColour] => [variant, colour]),
  );

  it.each(FILES)('uses the %s %s file as it is', (variant, colour) => {
    render(<Logo variant={variant} colour={colour} />);
    expect(img().getAttribute('src')).toBe(`/brand/svg/mustafa-apparels-${variant}-${colour}.svg`);
  });

  it('is black unless asked for white', () => {
    render(<Logo variant="submark" />);
    expect(img().getAttribute('src')).toMatch(/-black\.svg$/);
  });

  it.each(VARIANTS)(
    'reserves the %s file’s own shape, so nothing shifts or stretches',
    (variant) => {
      expect(LOGO_RATIO[variant]).toBeCloseTo(viewBoxRatio(variant), 3);
      render(<Logo variant={variant} height={200} />);
      expect(Number(img().getAttribute('height'))).toBe(200);
      expect(Number(img().getAttribute('width'))).toBe(Math.round(200 * viewBoxRatio(variant)));
    },
  );

  it('sets only the height in CSS', () => {
    render(<Logo variant="secondary" height={60} />);
    expect(img().style.height).toBe('60px');
    expect(img().style.width).toBe('auto');
  });

  it.each([
    ['primary', 140],
    ['secondary', 48],
    ['simplified', 28],
    ['submark', 32],
  ] as const)('shows the %s logo at %ipx by default', (variant, height) => {
    render(<Logo variant={variant} />);
    expect(img().style.height).toBe(`${height}px`);
  });

  it.each(VARIANTS)('never shows the %s logo below its minimum height', (variant) => {
    render(<Logo variant={variant} height={10} />);
    expect(img().style.height).toBe(`${LOGO_MIN_HEIGHT[variant]}px`);
    expect(Number(img().getAttribute('height'))).toBe(LOGO_MIN_HEIGHT[variant]);
  });

  it('keeps the minimums from docs/design.md §1.3', () => {
    expect(LOGO_MIN_HEIGHT).toEqual({ primary: 120, secondary: 40, simplified: 28, submark: 24 });
  });

  it('loads lazily unless asked to load eagerly', () => {
    const { unmount } = render(<Logo variant="primary" />);
    expect(img().getAttribute('loading')).toBe('lazy');
    unmount();
    render(<Logo variant="primary" loading="eager" />);
    expect(img().getAttribute('loading')).not.toBe('lazy');
  });
});

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
