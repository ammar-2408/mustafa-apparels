// Components may only use colour pairs from colour-pairs.ts (docs/design.md §1.2).
// Each class string is read on its own: a text-X class is checked against the bg-Y class with the
// same variant (hover:, aria-invalid: ...) in that string, else the string's plain bg-Y, else the
// white page. Limit: a background set on a parent element isn't seen, so text inside a bg-primary
// section is checked as if it were on white. Prefer putting text and its background together.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, test } from 'vitest';

import { ALLOWED_PAIRS } from '../colour-pairs.ts';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const themeCss = readFileSync(resolve(root, 'packages/config/tailwind/theme.css'), 'utf8');
const COLOURS = new Set([...themeCss.matchAll(/--color-([a-z-]+):\s*#/gi)].map(([, name]) => name));

const allowedText = new Set(
  ALLOWED_PAIRS.filter(([, , role]) => role !== 'ui').map(([fg, bg]) => `${fg}|${bg}`),
);

/** Returns "text-X on bg-Y" for every pairing in the source that isn't allowed. */
function badPairs(source) {
  const bad = [];
  for (const [, a, b, c] of source.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
    const classes = (a ?? b ?? c).split(/\s+/).filter(Boolean);
    const backgrounds = new Map();
    const texts = [];
    for (const cls of classes) {
      const parts = cls.split(':');
      const utility = parts.pop();
      const variant = parts.join(':');
      const bg = utility.match(/^bg-(.+)$/)?.[1];
      if (bg && (COLOURS.has(bg) || bg === 'transparent')) backgrounds.set(variant, bg);
      const text = utility.match(/^text-(.+)$/)?.[1];
      if (text && COLOURS.has(text)) texts.push([variant, text]);
    }
    for (const [variant, text] of texts) {
      let bg = backgrounds.get(variant) ?? backgrounds.get('') ?? 'bg';
      // A transparent background shows the white page.
      if (bg === 'transparent') bg = 'bg';
      if (!allowedText.has(`${text}|${bg}`)) bad.push(`text-${text} on bg-${bg}`);
    }
  }
  return bad;
}

describe('the scan itself', () => {
  test.each([
    ['className="text-primary"', 'text-primary on bg-bg'],
    ['className="text-accent"', 'text-accent on bg-bg'],
    ['className="bg-primary text-muted"', 'text-muted on bg-primary'],
    ['className="bg-primary text-accent-text"', 'text-accent-text on bg-primary'],
    ["'bg-accent text-action-fg'", 'text-action-fg on bg-accent'],
    ["'hover:bg-primary hover:text-error'", 'text-error on bg-primary'],
  ])('reports %s', (source, expected) => {
    assert.deepEqual(badPairs(source), [expected]);
  });

  test.each([
    'className="text-fg"',
    'className="bg-primary text-primary-fg"',
    'className="text-small text-muted"',
    "'border-action bg-action text-action-fg hover:bg-transparent hover:text-fg'",
    "'bg-accent text-accent-fg caps-tight'",
    'className="text-accent-text underline"',
  ])('allows %s', (source) => {
    assert.deepEqual(badPairs(source), []);
  });
});

const SCANNED = [
  'apps/web/app',
  'apps/web/components',
  'apps/admin/app',
  'apps/admin/components',
  'packages/ui/src',
];

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

const files = SCANNED.flatMap((dir) => [...sourceFiles(resolve(root, dir))]);

test('finds the component files', () => {
  assert.ok(files.length > 20, `${files.length} files`);
});

test.each(files.map((file) => [relative(root, file).replaceAll('\\', '/'), file]))(
  '%s uses only allowed colour pairs',
  (_name, file) => {
    assert.deepEqual(badPairs(readFileSync(file, 'utf8')), []);
  },
);
