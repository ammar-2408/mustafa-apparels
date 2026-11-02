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

describe('pre-commit-gate hook', () => {
  const gate = (command) =>
    spawnSync(process.execPath, [hookPath('pre-commit-gate.mjs')], {
      input: JSON.stringify({ tool_input: { command } }),
      encoding: 'utf8',
    });

  // It no longer runs lint, typecheck or tests: those run once in ship-change and again in Husky and CI.
  for (const command of [
    'git commit -m x',
    'git commit -F msg.txt',
    'git add src && git commit -m x',
    'git -C "D:/Mustafa Apparels" commit -m x',
    '(git commit -m x)',
    'git status',
    'git commit-tree HEAD^{tree}',
    'echo hi',
  ]) {
    test(`lets ${JSON.stringify(command)} through without running checks`, () => {
      assert.equal(gate(command).status, 0);
    });
  }

  for (const command of [
    'git commit --no-verify -m x',
    'git commit -m "a message" --no-verify',
    'git -C . commit -q --no-verify -F m',
    'git -c user.name=a commit --no-verify -m x',
    'git --no-pager commit --no-verify -m x',
    '(git commit --no-verify -m x)',
    '/usr/bin/git commit --no-verify -m x',
    'git.exe commit --no-verify -m x',
    '"git" commit --no-verify -m x',
  ]) {
    test(`blocks --no-verify: ${JSON.stringify(command)}`, () => {
      const result = gate(command);
      assert.equal(result.status, 2, command);
      assert.match(result.stderr, /--no-verify/);
    });
  }

  for (const command of [
    'git commit -m "explain why --no-verify is banned"',
    "git commit -m 'no --no-verify here'",
    "cat > m <<'EOF'\nsubject\n\nnever use --no-verify\nEOF\ngit commit -F m",
    'git commit -F m && echo --no-verify',
  ]) {
    test(`allows a commit that only mentions --no-verify: ${JSON.stringify(command)}`, () => {
      assert.equal(gate(command).status, 0);
    });
  }

  test('blocks when the hook input cannot be read', () => {
    const result = spawnSync(process.execPath, [hookPath('pre-commit-gate.mjs')], {
      input: 'not json',
      encoding: 'utf8',
    });
    assert.equal(result.status, 2);
  });
});
