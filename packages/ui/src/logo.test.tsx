import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Logo, LOGO_MIN_HEIGHT, LOGO_RATIO, type LogoColour, type LogoVariant } from './logo';

const VARIANTS: LogoVariant[] = ['primary', 'secondary', 'simplified', 'submark'];
const FULL_NAME = 'MA Apparels by Mustafa Ahmed';
const SHORT_NAME = 'MA Apparels';

const viewBoxRatio = (variant: LogoVariant) => {
  // The official logo pack; jsdom's URL can't resolve file paths, so build the path directly.
  const file = join(
    import.meta.dirname,
    `../../../mustafa-apparels-logos/mustafa-apparels-logos/svg/mustafa-apparels-${variant}-black.svg`,
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

  // Owner, 2026-11-17: the site's copies drop the line under APPARELS and show "BY MUSTAFA AHMED"
  // bigger and bolder. Only the divider of the secondary logo (taller than wide) stays.
  it.each(['primary', 'secondary'] as const)(
    'the site’s %s logo has no line under APPARELS and a bigger tagline',
    (variant) => {
      for (const colour of ['black', 'white']) {
        const svg = readFileSync(
          join(
            import.meta.dirname,
            `../../../apps/web/public/brand/svg/mustafa-apparels-${variant}-${colour}.svg`,
          ),
          'utf8',
        );
        const rects = [...svg.matchAll(/<rect [^>]*width="([\d.]+)" height="([\d.]+)"/g)];
        expect(rects.every(([, w, h]) => Number(h) > Number(w))).toBe(true);
        // The tagline is the last path: scaled up and outlined to make it heavier.
        const tagline = [...svg.matchAll(/<path [^>]*>/g)].at(-1)![0];
        expect(Number(tagline.match(/scale\(([\d.]+)\)/)?.[1])).toBeGreaterThanOrEqual(1.4);
        expect(tagline).toMatch(/stroke-width="[\d.]+"/);
        // The outer box is unchanged, so the logo keeps its place and proportions on the site.
        expect(
          svg
            .match(/viewBox="([^"]+)"/)![1]!
            .split(/\s+/)
            .map(Number)
            .at(-2)! /
            svg
              .match(/viewBox="([^"]+)"/)![1]!
              .split(/\s+/)
              .map(Number)
              .at(-1)!,
        ).toBeCloseTo(viewBoxRatio(variant), 3);
      }
    },
  );

  it('loads lazily unless asked to load eagerly', () => {
    const { unmount } = render(<Logo variant="primary" />);
    expect(img().getAttribute('loading')).toBe('lazy');
    unmount();
    render(<Logo variant="primary" loading="eager" />);
    expect(img().getAttribute('loading')).not.toBe('lazy');
  });
});
