// Runs real Prettier with the shared config. Uses node:test until Vitest arrives in step 0.5.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { format } from 'prettier';

import config from '../prettier.mjs';

const formatTs = (code) => format(code, { ...config, parser: 'typescript' });

test('uses single quotes, semicolons and two spaces', async () => {
  assert.equal(
    await formatTs('function f() {\n      return "a"\n}\n'),
    "function f() {\n  return 'a';\n}\n",
  );
});

test('wraps lines at 100 characters', async () => {
  const fits = `const a = '${'x'.repeat(87)}';\n`;
  assert.equal(fits.trimEnd().length, 100);
  assert.equal(await formatTs(fits), fits);

  const tooLong = `const a = '${'x'.repeat(88)}';\n`;
  assert.equal(tooLong.trimEnd().length, 101);
  assert.equal(await formatTs(tooLong), `const a =\n  '${'x'.repeat(88)}';\n`);
});

test('adds trailing commas', async () => {
  const code = `const a = ['${'x'.repeat(50)}', '${'y'.repeat(50)}'];\n`;
  assert.match(await formatTs(code), /',\n\];\n$/);
});

test('turns CRLF into LF', async () => {
  assert.equal(
    await formatTs("const a = 'x';\r\nconst b = 'y';\r\n"),
    "const a = 'x';\nconst b = 'y';\n",
  );
});
