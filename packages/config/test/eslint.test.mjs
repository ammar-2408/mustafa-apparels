// Runs real ESLint with the shared configs. Uses node:test until Vitest arrives in step 0.5.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import base from '../eslint/base.mjs';
import next from '../eslint/next.mjs';

// This package has no app/ or pages/ folder, which that rule warns about on every run.
const app = [...base, ...next, { rules: { '@next/next/no-html-link-for-pages': 'off' } }];

const eslintWith = (config, options = {}) =>
  new ESLint({ overrideConfigFile: true, overrideConfig: config, ...options });

async function ruleIds(config, code, filePath) {
  const [result] = await eslintWith(config).lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

const isOff = (entry) => entry === undefined || entry[0] === 0 || entry[0] === 'off';

test('base config flags unsorted imports', async () => {
  const ids = await ruleIds(
    base,
    "import b from 'b';\nimport a from 'a';\nexport { a, b };\n",
    'x.ts',
  );
  assert.ok(ids.includes('simple-import-sort/imports'));
});

test('base config fixes unsorted imports', async () => {
  const [result] = await eslintWith(base, { fix: true }).lintText(
    "import b from 'b';\nimport a from 'a';\nexport { a, b };\n",
    { filePath: 'x.ts' },
  );
  assert.equal(result.output, "import a from 'a';\nimport b from 'b';\nexport { a, b };\n");
});

test('base config flags an explicit any in TypeScript', async () => {
  const ids = await ruleIds(base, 'export const value: any = 1;\n', 'x.ts');
  assert.ok(ids.includes('@typescript-eslint/no-explicit-any'));
});

test('base config knows Node globals in .mjs but still flags unknown ones', async () => {
  const ids = await ruleIds(base, 'process.cwd();\nmissingGlobal();\n', 'x.mjs');
  assert.deepEqual(ids, ['no-undef']);
});

test('base config leaves formatting to Prettier', async () => {
  const { rules } = await eslintWith(base).calculateConfigForFile('x.ts');
  assert.ok(isOff(rules['no-mixed-spaces-and-tabs']));
});

test('next config flags an image with no alt text', async () => {
  const ids = await ruleIds(app, 'export const A = () => <img src="a.png" />;\n', 'x.tsx');
  assert.ok(ids.includes('jsx-a11y/alt-text'));
});

test('next config has the full a11y set, not only the Next.js subset', async () => {
  const ids = await ruleIds(app, 'export const A = () => <a href="#">Back</a>;\n', 'x.tsx');
  assert.ok(ids.includes('jsx-a11y/anchor-is-valid'));
});

test('next config has the Next.js rules', async () => {
  const ids = await ruleIds(app, 'export const A = () => <img src="a.png" alt="" />;\n', 'x.tsx');
  assert.ok(ids.includes('@next/next/no-img-element'));
});

test('next config does not detect React, so linting from the root stays quiet', async () => {
  const { settings } = await eslintWith(app).calculateConfigForFile('x.tsx');
  assert.notEqual(settings.react.version, 'detect');
});
