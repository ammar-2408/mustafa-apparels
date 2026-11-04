import assert from 'node:assert/strict';

import { test } from 'vitest';

import app from '../vitest/app.mjs';
import library from '../vitest/library.mjs';
import tooling from '../vitest/tooling.mjs';

test('library preset sets the 90% lines and 85% branches floor', () => {
  const { lines, branches } = library.test.coverage.thresholds;
  assert.equal(lines, 90);
  assert.equal(branches, 85);
});

test('library preset gives PGlite integration tests time to start', () => {
  assert.equal(library.test.testTimeout, 60_000);
  assert.equal(library.test.hookTimeout, 60_000);
});

test('app preset sets the 80% lines floor on server actions and route handlers', () => {
  const { thresholds } = app.test.coverage;
  assert.deepEqual(thresholds['app/**/actions.ts'], { lines: 80 });
  assert.deepEqual(thresholds['app/**/route.ts'], { lines: 80 });
});

test('app preset runs in jsdom, the others in Node', () => {
  assert.equal(app.test.environment, 'jsdom');
  assert.equal(library.test.environment, 'node');
  assert.equal(tooling.test.environment, 'node');
});

test('floored presets also count files that no test loads', () => {
  assert.ok(app.test.coverage.include.includes('app/**/*.{ts,tsx}'));
  assert.ok(library.test.coverage.include.includes('**/*.ts'));
});

test('every preset uses the v8 coverage provider', () => {
  for (const preset of [app, library, tooling]) {
    assert.equal(preset.test.coverage.provider, 'v8');
  }
});
