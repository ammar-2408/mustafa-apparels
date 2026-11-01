import assert from 'node:assert/strict';

import { test } from 'vitest';

import { robotsHeaders } from '../headers.ts';

const NOINDEX = [
  { source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
];

test('the storefront sends noindex until it is marked indexable', () => {
  assert.deepEqual(robotsHeaders('web', { SITE_INDEXABLE: 'false' }), NOINDEX);
});

test('the storefront sends noindex when the flag is missing', () => {
  assert.deepEqual(robotsHeaders('web', {}), NOINDEX);
});

test('the storefront sends no robots header once indexable', () => {
  assert.deepEqual(robotsHeaders('web', { SITE_INDEXABLE: 'true' }), []);
});

test('the admin always sends noindex, even with the flag on', () => {
  assert.deepEqual(robotsHeaders('admin', { SITE_INDEXABLE: 'true' }), NOINDEX);
  assert.deepEqual(robotsHeaders('admin', { SITE_INDEXABLE: 'false' }), NOINDEX);
});
