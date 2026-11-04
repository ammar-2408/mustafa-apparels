import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, test } from 'vitest';

import { brandIcons, brandManifest, brandViewport } from '../brand.ts';

const fromRoot = (file) => fileURLToPath(new URL(`../../../${file}`, import.meta.url));
const themeCss = readFileSync(fromRoot('packages/config/tailwind/theme.css'), 'utf8');
const token = (name) =>
  themeCss.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1].toLowerCase();

const iconUrls = [
  ...brandIcons.icon.map((icon) => icon.url),
  ...brandIcons.apple.map((icon) => icon.url),
];

test('the browser bar is powder blue, like the header band', () => {
  assert.equal(brandViewport.themeColor.toLowerCase(), token('primary'));
});

test('the favicon links put the SVG next to an .ico that Chrome will not prefer', () => {
  const ico = brandIcons.icon.find((icon) => icon.url === '/favicon.ico');
  const svg = brandIcons.icon.find((icon) => icon.type === 'image/svg+xml');
  assert.ok(svg, 'no SVG favicon');
  // sizes="any" on the .ico makes Chrome pick it over the SVG.
  assert.ok(ico && ico.sizes !== 'any', 'the .ico needs a fixed size');
});

describe.each(['web', 'admin'])('%s', (app) => {
  const manifest = brandManifest(app);

  test('manifest uses the brand colours and opens at the home page', () => {
    assert.equal(manifest.theme_color.toLowerCase(), token('primary'));
    assert.equal(manifest.background_color.toLowerCase(), token('bg'));
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.display, 'standalone');
  });

  test('manifest has 192 and 512 px PNG icons', () => {
    assert.deepEqual(
      manifest.icons.map((icon) => icon.sizes),
      ['192x192', '512x512'],
    );
  });

  test('every icon the head or manifest links to is in public/', () => {
    for (const url of [...iconUrls, ...manifest.icons.map((icon) => icon.src)]) {
      assert.ok(existsSync(fromRoot(`apps/${app}/public${url}`)), `${app} is missing ${url}`);
    }
  });
});

test('the storefront manifest uses the public shop name', () => {
  const { name, short_name } = brandManifest('web');
  assert.equal(name, 'Mustafa Apparels');
  assert.equal(short_name, 'Mustafa Apparels');
});

test('the admin manifest is told apart from the storefront on a home screen', () => {
  const admin = brandManifest('admin');
  assert.match(admin.name, /^Mustafa Apparels Admin$/);
  assert.notEqual(admin.short_name, brandManifest('web').short_name);
});
