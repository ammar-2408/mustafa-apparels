import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '@tailwindcss/node';
import { describe, test } from 'vitest';

import { ALLOWED_PAIRS, FORBIDDEN_TEXT, MINIMUM, SURFACE_ONLY } from '../colour-pairs.ts';

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
    assert.equal(contrast('#111111', '#ffffff').toFixed(2), '18.88');
    assert.equal(contrast('#f45b0b', '#ffffff').toFixed(2), '3.31');
  });

  test("keeps the owner's palette exact", () => {
    assert.equal(tokens.bg, '#ffffff');
    assert.equal(tokens.surface, '#ffffff');
    assert.equal(tokens.fg, '#111111');
    assert.equal(tokens.primary, '#a8c9c8');
    assert.equal(tokens.accent, '#f45b0b');
    assert.equal(tokens['accent-text'], '#c34909');
    assert.equal(tokens.action, '#111111');
    assert.equal(tokens['action-fg'], '#ffffff');
  });

  // The allowed list lives in colour-pairs.ts; a pair that fails its minimum fails the build.
  test.each(ALLOWED_PAIRS)('%s on %s (%s) meets WCAG AA', (fg, bg, role) => {
    assert.ok(tokens[fg] && tokens[bg], `missing token ${fg} or ${bg}`);
    const value = ratio(fg, bg);
    assert.ok(
      value >= MINIMUM[role],
      `${fg} on ${bg} is ${value.toFixed(2)}:1, needs ${MINIMUM[role]}`,
    );
  });

  test('every colour token has a role, so a new one needs a decision', () => {
    const roles = new Set([...ALLOWED_PAIRS.flatMap(([fg, bg]) => [fg, bg]), ...SURFACE_ONLY]);
    for (const name of Object.keys(tokens)) {
      assert.ok(roles.has(name), `--color-${name} has no entry in colour-pairs.ts`);
    }
  });

  test('surface-only colours are never allowed as text', () => {
    for (const name of SURFACE_ONLY) {
      const asText = ALLOWED_PAIRS.filter(([fg, , role]) => fg === name && role !== 'ui');
      assert.deepEqual(asText, [], `${name} is surface-only`);
    }
  });

  test.each(FORBIDDEN_TEXT)('%s text on %s is never allowed, and really fails', (fg, bg) => {
    assert.ok(ratio(fg, bg) < MINIMUM.text, `${fg} on ${bg} passes now; drop it from the list`);
    const allowed = ALLOWED_PAIRS.some(([f, b, role]) => f === fg && b === bg && role !== 'ui');
    assert.equal(allowed, false, `${fg} on ${bg} must not be allowed as text`);
  });

  test('error and success are told apart from the muted text colour', () => {
    // Not a WCAG rule, but a state colour that looks like muted text goes unseen.
    assert.notEqual(tokens.error, tokens.muted);
    assert.notEqual(tokens.success, tokens.muted);
  });
});

describe.each(['web', 'admin'])('%s globals.css with the shared theme', (app) => {
  const base = resolve(root, `apps/${app}/app`);
  const compileApp = () =>
    compile(readFileSync(resolve(base, 'globals.css'), 'utf8'), { base, onDependency: () => {} });
  const build = async (candidates) => (await compileApp()).build(candidates);

  test('gives every focused control an orange ring, and an ink one on powder blue', async () => {
    const out = await build([]);
    assert.match(
      out,
      /:focus-visible\s*\{\s*outline: 2px solid var\(--color-accent\);\s*outline-offset: 2px;/,
    );
    assert.match(
      out,
      /\.bg-primary:focus-visible,\s*\.bg-primary :focus-visible\s*\{\s*outline-color: var\(--color-fg\);/,
    );
  });

  test('scans packages/ui for class names', async () => {
    const { sources } = await compileApp();
    const dirs = sources.map((source) => resolve(source.base, source.pattern));
    assert.ok(dirs.includes(resolve(root, 'packages/ui/src')), dirs.join(', '));
  });

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
      'bg-primary',
      'bg-action',
      'text-accent-text',
      'decoration-accent',
      'text-fg',
      'border-border-strong',
      'bg-red-500',
      'text-white',
    ]);
    assert.match(out, /\.bg-bg\s*\{\s*background-color: var\(--color-bg\)/);
    assert.match(out, /\.bg-primary\s*\{\s*background-color: var\(--color-primary\)/);
    assert.match(out, /\.bg-action\s*\{/);
    assert.match(out, /\.text-accent-text\s*\{\s*color: var\(--color-accent-text\)/);
    assert.match(out, /\.decoration-accent\s*\{/);
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

  test('paints the page white with ink text', async () => {
    const out = await build([]);
    assert.match(out, /body\s*\{[^}]*background-color: var\(--color-bg\)/);
    assert.match(out, /body\s*\{[^}]*color: var\(--color-fg\)/);
  });

  test('sets Montserrat as the only font family', async () => {
    const out = await build(['font-sans', 'font-serif', 'font-mono']);
    assert.match(out, /--font-sans:\s*var\(--font-montserrat\)/);
    assert.match(out, /\.font-sans\s*\{\s*font-family: var\(--font-sans\)/);
    assert.doesNotMatch(out, /\.font-serif|\.font-mono/);
  });

  test('offers only the two loaded weights, so nothing is faux-bolded', async () => {
    const out = await build(['font-light', 'font-normal', 'font-medium', 'font-bold']);
    assert.match(out, /--font-weight-light:\s*300/);
    assert.match(out, /--font-weight-normal:\s*400/);
    assert.match(out, /\.font-light\s*\{/);
    assert.match(out, /\.font-normal\s*\{/);
    assert.doesNotMatch(out, /\.font-medium|\.font-bold/);
  });

  test('generates the type scale and drops the default sizes', async () => {
    const out = await build(['text-display', 'text-h1', 'text-body', 'text-label', 'text-xl']);
    assert.match(
      out,
      /\.text-display\s*\{\s*font-size: var\(--text-display\);\s*line-height: var\(--tw-leading, var\(--text-display--line-height\)\)/,
    );
    assert.match(out, /\.text-body\s*\{\s*font-size: var\(--text-body\)/);
    assert.doesNotMatch(out, /\.text-xl/);
  });

  test('caps sets spaced capitals at 0.4em, and caps-tight at 0.2em for phones', async () => {
    const out = await build(['caps', 'caps-tight']);
    const rule = (name) => out.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
    for (const name of ['caps', 'caps-tight']) {
      assert.match(rule(name), /text-transform: uppercase/, name);
      assert.match(rule(name), /font-weight: var\(--font-weight-normal\)/, name);
      assert.match(rule(name), /font-size: var\(--text-label\)/, name);
    }
    assert.match(rule('caps'), /letter-spacing: 0\.4em/);
    assert.match(rule('caps-tight'), /letter-spacing: 0\.2em/);
  });
});

describe('type scale', () => {
  const sizes = Object.fromEntries(
    [...themeCss.matchAll(/--text-([a-z0-9-]+?):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
  const rem = (value) => Number(value.match(/^([\d.]+)rem$/)?.[1]);
  const headings = ['display', 'h1', 'h2', 'h3'];

  test.each(headings)('%s is fluid with clamp() and never below 20px', (name) => {
    const [, min] = sizes[name]?.match(/^clamp\(([\d.]+rem),/) ?? [];
    assert.ok(min, `${name} is not a clamp() with a rem minimum: ${sizes[name]}`);
    // Light 300 gets hard to read under about 20px (docs/design.md §1.2).
    assert.ok(rem(min) >= 1.25, `${name} starts at ${min}`);
  });

  test.each(['display', 'h1', 'h2'])('%s has tight leading', (name) => {
    assert.ok(Number(sizes[`${name}--line-height`]) <= 1.15, sizes[`${name}--line-height`]);
  });

  test('labels are small and body text is at least 16px', () => {
    assert.ok(rem(sizes.label) <= 0.8125);
    assert.ok(rem(sizes.body) >= 1);
  });
});
