// Modules that hold secrets never reach the browser (Phase 4 review, step 5.5).
// - packages/auth/factory.ts imports 'server-only', so a client import fails the build.
// - packages/core/integrations/media.ts can't: scripts/import-stock.ts loads it in plain Node, where
//   'server-only' throws. It reads no env and takes secrets only as arguments; this test is its
//   guard instead: no 'use client' file may import it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SECRET_MODULES = ['@mustafa/core/integrations/media', '@mustafa/auth/factory'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.next', 'coverage', '.turbo'].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const isClient = (text: string) => /^\s*['"]use client['"]/.test(text);

describe('secret-holding modules stay on the server', () => {
  it('no client component imports them', () => {
    const offenders = ['apps', 'packages']
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return isClient(text) && SECRET_MODULES.some((m) => text.includes(`'${m}'`));
      });
    expect(offenders).toEqual([]);
  });

  it('the auth factory imports server-only first', () => {
    const text = readFileSync(join(ROOT, 'packages/auth/factory.ts'), 'utf8');
    expect(text).toMatch(/^(\/\/.*\n)*import 'server-only';/);
  });

  it('media.ts reads no env, so its secrets only ever come in as arguments', () => {
    const text = readFileSync(join(ROOT, 'packages/core/integrations/media.ts'), 'utf8');
    expect(text).not.toMatch(/process\.env/);
    expect(text).toContain('No server-only import');
  });
});
