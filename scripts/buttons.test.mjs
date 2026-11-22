// Every template button ends with its round arrow (owner's button-template.png, 2026-11-22;
// docs/brand.md §8). `<Button>` adds it itself; a link or plain <button> styled with
// buttonClass('primary' | 'secondary') must add `<ButtonCircle />`. This counts both per file, so a
// new button can't miss it. The home hero pair ('deep', 'deep-outline') has no circle.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === 'node_modules' || name === '.next') continue;
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) yield path;
  }
}

const files = ['apps/web/app', 'apps/web/components', 'apps/admin/app', 'apps/admin/components']
  .flatMap((dir) => [...sourceFiles(join(root, dir))])
  .map((file) => [relative(root, file).replaceAll('\\', '/'), readFileSync(file, 'utf8')]);

const templateCalls = (source) =>
  [...source.matchAll(/buttonClass\(\s*(['"](primary|secondary)['"]|\))/g)].length;
const circles = (source) => [...source.matchAll(/<ButtonCircle\b/g)].length;

test('finds the apps’ files', () => {
  assert.ok(files.length > 40, `${files.length} files`);
});

test.each(files.filter(([, source]) => templateCalls(source) > 0))(
  '%s gives every template button link its round arrow',
  (_name, source) => {
    assert.ok(
      circles(source) >= templateCalls(source),
      `${templateCalls(source)} template buttons, ${circles(source)} <ButtonCircle>`,
    );
  },
);
