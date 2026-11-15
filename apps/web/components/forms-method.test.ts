// Every form says how it sends. A form with no method sends a GET, so one submitted before the
// page's scripts load would put a name, phone, message or password into the address bar, browser
// history and server logs. Search is the one form meant to be a GET.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { expect, it } from 'vitest';

const root = join(__dirname, '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === 'node_modules' || name.startsWith('.') ? [] : sources(path);
    return name.endsWith('.tsx') && !name.endsWith('.test.tsx') ? [path] : [];
  });
}

it('every <form> sets method="post", or method="get" for search', () => {
  const problems = [...sources(join(root, 'components')), ...sources(join(root, 'app'))].flatMap(
    (file) =>
      [...readFileSync(file, 'utf8').matchAll(/<form\b([^>]*)>/g)]
        .filter(([, attributes]) => !/method="(post|get)"/.test(attributes!))
        .map(() => relative(root, file)),
  );
  expect(problems).toEqual([]);
});
