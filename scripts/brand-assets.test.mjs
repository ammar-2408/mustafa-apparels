// The logo files each app serves from public/ (docs/design.md §1.3), copied unchanged.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from 'vitest';

const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const PACK = 'mustafa-apparels-logos/mustafa-apparels-logos';

// favicon.ico sits at public/favicon.ico instead, where browsers ask for it.
const FAVICONS = [
  'favicon.svg',
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

// Owner, 2026-11-17 (docs/design.md §1.3): the website's primary and secondary logos drop the line
// under APPARELS, with "BY MUSTAFA AHMED" scaled up and slightly heavier.
const OWNER_EDITED = new Set(
  ['primary', 'secondary'].flatMap((variant) =>
    ['black', 'white'].map((colour) => `svg/mustafa-apparels-${variant}-${colour}.svg`),
  ),
);
const shapes = (svg) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const fills = (svg) => [...new Set([...svg.matchAll(/fill="(#[0-9A-Fa-f]+)"/g)].map((m) => m[1]))];
const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
const horizontalRules = (svg) =>
  [...svg.matchAll(/<rect [^>]*width="([\d.]+)" height="([\d.]+)"/g)].filter(
    (m) => Number(m[1]) > Number(m[2]),
  ).length;

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

  test(`${app} serves favicon.ico from the site root, unchanged from the logo pack`, () => {
    const copy = fromRoot(`apps/${app}/public/favicon.ico`);
    assert.ok(existsSync(copy), `apps/${app}/public/favicon.ico is missing`);
    assert.ok(readFileSync(copy).equals(readFileSync(fromRoot(`${PACK}/favicon/favicon.ico`))));
  });

  test(`${app} has exactly the logo files docs/design.md lists`, () => {
    assert.ok(existsSync(fromRoot(brandDir)), `${brandDir} is missing`);
    const expected = Object.entries(folders)
      .flatMap(([folder, files]) => files.map((file) => `${folder}/${file}`))
      .sort();
    assert.deepEqual(listFiles(brandDir), expected);
  });

  for (const [folder, files] of Object.entries(folders)) {
    for (const file of files) {
      if (app === 'web' && OWNER_EDITED.has(`${folder}/${file}`)) {
        test(`${app} serves ${folder}/${file} with the pack's own shapes, only re-arranged`, () => {
          const copy = readFileSync(fromRoot(`${brandDir}/${folder}/${file}`), 'utf8');
          const pack = readFileSync(fromRoot(`${PACK}/${folder}/${file}`), 'utf8');
          // Every outline and colour is the pack's: nothing redrawn or recoloured.
          assert.deepEqual(shapes(copy), shapes(pack));
          assert.deepEqual(fills(copy), fills(pack));
          assert.equal(viewBox(copy), viewBox(pack));
          // The one difference: the line under APPARELS is gone.
          assert.equal(horizontalRules(copy), 0);
        });
        continue;
      }
      test(`${app} serves ${folder}/${file} unchanged from the logo pack`, () => {
        const copy = fromRoot(`${brandDir}/${folder}/${file}`);
        assert.ok(existsSync(copy), `${brandDir}/${folder}/${file} is missing`);
        assert.ok(readFileSync(copy).equals(readFileSync(fromRoot(`${PACK}/${folder}/${file}`))));
      });
    }
  }
}

// Not a logo-pack file: the unchanged primary black logo on powder blue, made for the new palette
// (docs/design.md §8). Kept outside public/brand/, which holds only logo-pack copies.
test('the default share image is a 1200×630 PNG under 100 kB', () => {
  const file = readFileSync(fromRoot('apps/web/public/og/og-default-1200x630.png'));
  assert.equal(file.subarray(1, 4).toString('latin1'), 'PNG');
  assert.equal(file.readUInt32BE(16), 1200);
  assert.equal(file.readUInt32BE(20), 630);
  assert.ok(file.length < 100_000, `${file.length} bytes`);
});
