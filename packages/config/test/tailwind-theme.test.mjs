import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '@tailwindcss/node';
import { describe, test } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const themeCss = readFileSync(resolve(root, 'packages/config/tailwind/theme.css'), 'utf8');

const tokens = Object.fromEntries(
  [...themeCss.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, hex]) => [
    name,
    hex.toLowerCase(),
  ]),
);

// WCAG 2.2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const ratio = (fg, bg) => contrast(tokens[fg], tokens[bg]);

describe('colour tokens', () => {
  test('the contrast helper matches known WCAG values', () => {
    assert.equal(contrast('#000000', '#ffffff'), 21);
    assert.equal(contrast('#ffffff', '#ffffff'), 1);
    assert.equal(contrast('#111111', '#faf7ec').toFixed(2), '17.61');
  });

  test('keeps the three official logo colours exact', () => {
    assert.equal(tokens.bg, '#faf7ec');
    assert.equal(tokens.surface, '#ffffff');
    assert.equal(tokens.fg, '#111111');
  });

  // [foreground, background, minimum]: 4.5 for text, 3 for UI borders.
  const pairs = [
    ['fg', 'bg', 4.5],
    ['fg', 'surface', 4.5],
    ['muted', 'bg', 4.5],
    ['muted', 'surface', 4.5],
    ['accent', 'bg', 4.5],
    ['accent-fg', 'accent', 4.5],
    ['inverse-muted', 'inverse-bg', 4.5],
    ['bg', 'inverse-bg', 4.5],
    ['error', 'bg', 4.5],
    ['error', 'surface', 4.5],
    ['success', 'bg', 4.5],
    ['success', 'surface', 4.5],
    ['border-strong', 'bg', 3],
    ['border-strong', 'surface', 3],
  ];

  test.each(pairs)('%s on %s reaches %s:1', (fg, bg, min) => {
    assert.ok(tokens[fg] && tokens[bg], `missing token ${fg} or ${bg}`);
    const value = ratio(fg, bg);
    assert.ok(value >= min, `${fg} on ${bg} is ${value.toFixed(2)}:1`);
  });

  test('error and success are told apart from the muted text colour', () => {
    // Not a WCAG rule, but a state colour that looks like muted text goes unseen.
    assert.notEqual(tokens.error, tokens.muted);
    assert.notEqual(tokens.success, tokens.muted);
  });
});

describe.each(['web', 'admin'])('%s globals.css with the shared theme', (app) => {
  const base = resolve(root, `apps/${app}/app`);
  const build = async (candidates) => {
    const css = readFileSync(resolve(base, 'globals.css'), 'utf8');
    const compiler = await compile(css, { base, onDependency: () => {} });
    return compiler.build(candidates);
  };

  test('defines every brand token as a CSS variable, used or not', async () => {
    const out = await build([]);
    for (const [name, hex] of Object.entries(tokens)) {
      assert.match(out, new RegExp(`--color-${name}:\\s*${hex}`, 'i'));
    }
    assert.match(out, /--spacing-gutter:\s*clamp\(1rem, 4vw, 3rem\)/);
    assert.match(out, /--spacing-grid:\s*clamp\(0\.75rem, 2vw, 1\.5rem\)/);
    assert.match(out, /--spacing-section:\s*clamp\(4rem, 10vw, 10rem\)/);
    assert.match(out, /--radius-sm:\s*2px/);
  });

  test('generates brand utilities and drops the default palette', async () => {
    const out = await build([
      'bg-bg',
      'text-fg',
      'border-border-strong',
      'bg-red-500',
      'text-white',
    ]);
    assert.match(out, /\.bg-bg\s*\{\s*background-color: var\(--color-bg\)/);
    assert.match(out, /\.text-fg\s*\{\s*color: var\(--color-fg\)/);
    assert.match(out, /\.border-border-strong\s*\{/);
    assert.doesNotMatch(out, /\.bg-red-500/);
    assert.doesNotMatch(out, /\.text-white/);
  });

  test('generates the spacing, width, radius and shadow utilities', async () => {
    const out = await build([
      'px-gutter',
      'gap-grid',
      'py-section',
      'max-w-content',
      'rounded-sm',
      'shadow-soft',
      'rounded-xl',
    ]);
    assert.match(out, /\.px-gutter\s*\{\s*padding-inline: var\(--spacing-gutter\)/);
    assert.match(out, /\.gap-grid\s*\{\s*gap: var\(--spacing-grid\)/);
    assert.match(out, /\.py-section\s*\{\s*padding-block: var\(--spacing-section\)/);
    assert.match(out, /\.max-w-content\s*\{\s*max-width: var\(--container-content\)/);
    assert.match(out, /\.rounded-sm\s*\{\s*border-radius: var\(--radius-sm\)/);
    assert.match(out, /\.shadow-soft\s*\{/);
    assert.doesNotMatch(out, /\.rounded-xl/);
  });

  test('uses the custom breakpoints from docs/design.md §2', async () => {
    const expected = {
      sm: '30rem',
      md: '48rem',
      lg: '64rem',
      xl: '80rem',
      '2xl': '96rem',
      '3xl': '120rem',
      '4xl': '160rem',
    };
    for (const [bp, width] of Object.entries(expected)) {
      const out = await build([`${bp}:flex`]);
      assert.match(out, new RegExp(`@media \\(width >= ${width}\\)`), bp);
    }
    const out = await build(['sm:flex']);
    // Tailwind's own sm is 40rem; it must be gone.
    assert.doesNotMatch(out, /width >= 40rem/);
  });

  test('paints the page cream with ink text', async () => {
    const out = await build([]);
    assert.match(out, /body\s*\{[^}]*background-color: var\(--color-bg\)/);
    assert.match(out, /body\s*\{[^}]*color: var\(--color-fg\)/);
  });
});
