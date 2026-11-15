// The storefront's browser code imports these validators, and the browser bundle must never carry
// the list of banned brand names (AGENTS.md §1, docs/database.md §9). Each one, and everything it
// imports, has to stay clear of banned-terms.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CLIENT_SAFE = [
  'inquiry',
  'auth',
  'password-strength',
  'taxonomy',
  'phone',
  'search',
  'fields',
  'account',
  'paging',
  'revalidate',
];

function localImports(name: string): string[] {
  const source = readFileSync(join(__dirname, `${name}.ts`), 'utf8');
  return [...source.matchAll(/from '\.\/([\w-]+)'|import '\.\/([\w-]+)'/g)].map(
    (m) => (m[1] ?? m[2])!,
  );
}

function reaches(name: string, seen = new Set<string>()): Set<string> {
  for (const next of localImports(name)) {
    if (!seen.has(next)) {
      seen.add(next);
      reaches(next, seen);
    }
  }
  return seen;
}

describe('validators the browser loads', () => {
  it.each(CLIENT_SAFE)('%s never imports the banned brand list', (name) => {
    const graph = reaches(name);
    expect([...graph].filter((m) => m === 'banned-terms' || m === 'common')).toEqual([]);
  });

  it('the server-only fields still check for brands', () => {
    expect(reaches('common').has('banned-terms')).toBe(true);
    expect(reaches('product').has('banned-terms')).toBe(true);
  });
});
