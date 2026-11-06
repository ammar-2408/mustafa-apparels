// Cache tags are built only by @mustafa/validators/revalidate, so the tags the storefront caches
// under and the tags the admin sends can't drift apart (docs/api.md §4).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', 'coverage', '.turbo']);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const HAND_MADE = [
  /['"`](product|category):/, // a tag string written out
  /cacheTag\(\s*['"`]/, // a literal passed to cacheTag
  /revalidateStorefront\(\s*\[\s*['"`]/, // a literal list sent to the storefront
  /revalidateTag\(\s*['"`]/,
];

describe('cache tags', () => {
  it('are never written by hand in the apps or scripts', () => {
    const files = [
      ...sources(join(ROOT, 'apps')),
      ...sources(join(ROOT, 'scripts')).filter((file) => !file.endsWith('cache-tags.test.ts')),
    ];
    const offenders = files.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return HAND_MADE.some((pattern) => pattern.test(text)) ? [relative(ROOT, file)] : [];
    });
    expect(offenders).toEqual([]);
  });
});
