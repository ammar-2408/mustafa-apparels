import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { test } from 'vitest';

const path = (file) => fileURLToPath(new URL(file, import.meta.url));

function loadOptions(config) {
  const parsed = ts.getParsedCommandLineOfConfigFile(path(config), undefined, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  });
  // TS18003 "no inputs": expected, a shared config lists no files of its own.
  assert.deepEqual(
    parsed.errors.filter((error) => error.code !== 18003),
    [],
  );
  return parsed.options;
}

function errorCodes(fixture) {
  const program = ts.createProgram(
    [path(`./fixtures/${fixture}`)],
    loadOptions('../tsconfig/base.json'),
  );
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => diagnostic.code);
}

test('base config accepts valid code', () => {
  assert.deepEqual(errorCodes('valid.ts'), []);
});

test('base config rejects an implicit any', () => {
  assert.ok(errorCodes('implicit-any.ts').includes(7006));
});

test('base config rejects an unchecked index access', () => {
  assert.ok(errorCodes('unchecked-index.ts').includes(2532));
});

test('base config rejects an override without the keyword', () => {
  assert.ok(errorCodes('missing-override.ts').includes(4114));
});

test('nextjs config keeps strict mode and adds what Next.js needs', () => {
  const options = loadOptions('../tsconfig/nextjs.json');
  assert.equal(options.strict, true);
  assert.equal(options.noUncheckedIndexedAccess, true);
  assert.equal(options.jsx, ts.JsxEmit.ReactJSX);
  assert.ok(options.lib.includes('lib.dom.d.ts'));
  assert.deepEqual(options.plugins, [{ name: 'next' }]);
});
