// The logo files each app serves from public/brand/ (docs/design.md §1.3), copied unchanged.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from 'vitest';

const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const PACK = 'mustafa-apparels-logos/mustafa-apparels-logos';

const FAVICONS = [
  'favicon.svg',
  'favicon.ico',
  'favicon-32.png',
  'apple-touch-icon-180.png',
  'icon-192.png',
  'icon-512.png',
];
const ALL_SVGS = ['primary', 'secondary', 'simplified', 'submark'].flatMap((variant) =>
  ['black', 'white'].map((colour) => `mustafa-apparels-${variant}-${colour}.svg`),
);

const BRAND = {
  web: {
    svg: ALL_SVGS,
    favicon: FAVICONS,
    social: ['og-share-image-1200x630.png'],
  },
  admin: {
    svg: ['mustafa-apparels-submark-black.svg', 'mustafa-apparels-simplified-black.svg'],
    favicon: FAVICONS,
  },
};

/** Every file under a folder, as paths relative to it. */
const listFiles = (dir) =>
  readdirSync(fromRoot(dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(fromRoot(dir), path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'),
    )
    .sort();

for (const [app, folders] of Object.entries(BRAND)) {
  const brandDir = `apps/${app}/public/brand`;

  test(`${app} has exactly the logo files docs/design.md lists`, () => {
    assert.ok(existsSync(fromRoot(brandDir)), `${brandDir} is missing`);
    const expected = Object.entries(folders)
      .flatMap(([folder, files]) => files.map((file) => `${folder}/${file}`))
      .sort();
    assert.deepEqual(listFiles(brandDir), expected);
  });

  for (const [folder, files] of Object.entries(folders)) {
    for (const file of files) {
      test(`${app} serves ${folder}/${file} unchanged from the logo pack`, () => {
        const copy = fromRoot(`${brandDir}/${folder}/${file}`);
        assert.ok(existsSync(copy), `${brandDir}/${folder}/${file} is missing`);
        assert.ok(readFileSync(copy).equals(readFileSync(fromRoot(`${PACK}/${folder}/${file}`))));
      });
    }
  }
}
