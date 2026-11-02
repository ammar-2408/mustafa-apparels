import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, test } from 'vitest';

const hookPath = (name) => fileURLToPath(new URL(`../.claude/hooks/${name}`, import.meta.url));

// Run a hook the way Claude Code does: JSON on stdin, project dir in the env.
const runHook = (name, input, projectDir) =>
  spawnSync(process.execPath, [hookPath(name)], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    cwd: projectDir,
    encoding: 'utf8',
  });

describe('protect-files hook', () => {
  let root;
  const edit = (filePath) =>
    runHook('protect-files.mjs', { tool_input: { file_path: filePath } }, root);

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'protect-files-'));
    mkdirSync(path.join(root, 'packages/db/migrations'), { recursive: true });
    writeFileSync(path.join(root, 'packages/db/migrations/0000_init.sql'), 'select 1;\n');
    writeFileSync(path.join(root, 'packages/db/migrations/0001_new.sql'), 'select 2;\n');
    spawnSync('git', ['init', '-q'], { cwd: root });
    spawnSync('git', ['add', 'packages/db/migrations/0000_init.sql'], { cwd: root });
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  // Windows ignores case, trailing dots and spaces, and reads `name::$DATA` as `name`,
  // so each spelling below reaches the protected file.
  const blocked = [
    '.env',
    '.env.local',
    'apps/web/.env.production.local',
    './.env.local',
    'apps\\web\\.env.local',
    '.ENV.local',
    'apps\\web\\.Env',
    '.env ',
    '.env.',
    '.env::$DATA',
    'Business data',
    'Business data/',
    'Business data/x.jpg',
    'Business data\\x.jpg',
    './Business data/x.jpg',
    'apps/../Business data/x.jpg',
    'business data/x.jpg',
    'BUSINESS DATA\\Stock\\a.jpg',
    'Business Data/x.jpg',
    'Business data./x.jpg',
    'Business data /x.jpg',
    'Business data::$INDEX_ALLOCATION/x.jpg',
    'pnpm-lock.yaml',
    '.\\pnpm-lock.yaml',
    'PNPM-LOCK.YAML',
    'pnpm-lock.yaml.',
    'pnpm-lock.yaml::$DATA',
    'packages/db/migrations/0000_init.sql',
    'packages\\db\\migrations\\0000_init.sql',
    'Packages/DB/Migrations/0000_INIT.sql',
  ];

  for (const file of blocked) {
    test(`blocks ${JSON.stringify(file)}`, () => {
      const result = edit(file);
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /^Blocked edit/);
    });
  }

  test('blocks absolute paths, including the \\\\?\\ long-path form', () => {
    for (const file of [
      path.join(root, '.env.local'),
      path.join(root, 'Business data', 'x.jpg'),
      path.join(root, 'packages', 'db', 'migrations', '0000_init.sql'),
      `\\\\?\\${path.join(root, 'Business data', 'x.jpg')}`,
    ]) {
      assert.equal(edit(file).status, 2, file);
    }
  });

  test.runIf(process.platform === 'win32')('blocks an absolute path in another case', () => {
    assert.equal(edit(path.join(root.toUpperCase(), 'BUSINESS DATA', 'x.jpg')).status, 2);
  });

  const allowed = [
    '.env.example',
    '.envrc',
    'README.md',
    'Business datax/y.jpg',
    'catalog/dhanak/d-01.md',
    'apps/web/app/page.tsx',
    'packages/db/migrations/0001_new.sql',
    path.join(tmpdir(), 'somewhere-else', 'notes.txt'),
  ];

  for (const file of allowed) {
    test(`allows ${JSON.stringify(file)}`, () => {
      const result = edit(file);
      assert.equal(result.status, 0, result.stderr);
    });
  }

  test('checks notebook edits too', () => {
    const result = runHook(
      'protect-files.mjs',
      { tool_input: { notebook_path: 'Business data/x.ipynb' } },
      root,
    );
    assert.equal(result.status, 2);
  });

  test('allows a call with no file path', () => {
    assert.equal(runHook('protect-files.mjs', { tool_input: {} }, root).status, 0);
  });

  test('blocks when the hook input cannot be read', () => {
    const result = runHook('protect-files.mjs', 'not json', root);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /could not read/i);
  });
});
