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
  const roots = [];
  const git = (cwd, ...args) =>
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.co', ...args], { cwd });

  // A repo whose `pnpm test` exits with the given code, with the given files changed.
  const makeRepo = ({ test = 'process.exit(1)', changed = ['src/a.ts'], packageJson } = {}) => {
    const root = mkdtempSync(path.join(tmpdir(), 'commit-gate-'));
    roots.push(root);
    git(root, 'init', '-q');
    mkdirSync(path.join(root, 'node_modules'));
    writeFileSync(
      path.join(root, 'package.json'),
      packageJson ?? JSON.stringify({ private: true, scripts: { test: `node -e "${test}"` } }),
    );
    writeFileSync(path.join(root, '.git/info/exclude'), 'node_modules/\npackage.json\n');
    for (const file of changed) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), 'x\n');
    }
    return root;
  };

  const gate = (command, root, env = {}) =>
    spawnSync(process.execPath, [hookPath('pre-commit-gate.mjs')], {
      input: JSON.stringify({ tool_input: { command } }),
      env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env },
      cwd: root,
      encoding: 'utf8',
    });

  // On Windows a timed-out check's child process outlives its shell for a few seconds and
  // keeps its folder open, so removal retries.
  afterAll(() => {
    for (const root of roots) {
      rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    }
  });

  let failing;
  beforeAll(() => {
    failing = makeRepo();
  });

  const gated = [
    'git commit -m x',
    'git commit -F msg.txt',
    'git add src && git commit -m x',
    'pnpm lint; git commit -m x',
    'git -C . commit -m x',
    'git -C "D:/Mustafa Apparels" commit -m x',
    'git -c user.name=a commit -m x',
    'git --no-pager commit -m x',
    'git --git-dir=.git commit -m x',
    '(git commit -m x)',
    'echo $(git commit -m x)',
    '/usr/bin/git commit -m x',
    'git.exe commit -m x',
    '"git" commit -m x',
  ];

  for (const command of gated) {
    test(`runs the checks before ${JSON.stringify(command)}`, () => {
      const result = gate(command, failing);
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /"pnpm test" failed/);
    });
  }

  for (const command of ['git status', 'git commit-tree HEAD^{tree}', 'legit commit', 'echo hi']) {
    test(`leaves ${JSON.stringify(command)} alone`, () => {
      assert.equal(gate(command, failing).status, 0);
    });
  }

  test('lets a commit through when the checks pass', () => {
    const result = gate('git commit -m x', makeRepo({ test: 'process.exit(0)' }));
    assert.equal(result.status, 0, result.stderr);
  });

  test('blocks --no-verify even when the checks pass', () => {
    const root = makeRepo({ test: 'process.exit(0)' });
    for (const command of [
      'git commit --no-verify -m x',
      'git commit -m "a message" --no-verify',
      'git -C . commit -q --no-verify -F m',
    ]) {
      const result = gate(command, root);
      assert.equal(result.status, 2, command);
      assert.match(result.stderr, /--no-verify/);
    }
  });

  for (const command of [
    'git commit -m "explain why --no-verify is banned"',
    "git commit -m 'no --no-verify here'",
    "cat > m <<'EOF'\nsubject\n\nnever use --no-verify\nEOF\ngit commit -F m",
    'git commit -F m && echo --no-verify',
  ]) {
    test(`allows a commit that only mentions --no-verify: ${JSON.stringify(command)}`, () => {
      const result = gate(command, makeRepo({ test: 'process.exit(0)' }));
      assert.equal(result.status, 0, result.stderr);
    });
  }

  test('skips the checks when only docs/ changed', () => {
    assert.equal(gate('git commit -m x', makeRepo({ changed: ['docs/a.md'] })).status, 0);
  });

  for (const file of ['AGENTS.md', 'catalog/dhanak/d-01.md', '.claude/agents/x.md']) {
    test(`runs the checks when ${file} changed, because tests read it`, () => {
      assert.equal(gate('git commit -m x', makeRepo({ changed: [file] })).status, 2);
    });
  }

  test('runs the checks when a code file is renamed into docs/', () => {
    const root = makeRepo({ changed: ['a.ts'] });
    git(root, 'add', 'a.ts');
    git(root, '-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', 'init');
    mkdirSync(path.join(root, 'docs'));
    git(root, 'mv', 'a.ts', 'docs/a.md');
    assert.equal(gate('git commit -m x', root).status, 2);
  });

  test('skips the checks before dependencies are installed', () => {
    const root = makeRepo();
    rmSync(path.join(root, 'node_modules'), { recursive: true });
    assert.equal(gate('git commit -m x', root).status, 0);
  });

  test('blocks when package.json cannot be parsed', () => {
    const result = gate('git commit -m x', makeRepo({ packageJson: '{ not json' }));
    assert.equal(result.status, 2);
    assert.match(result.stderr, /package\.json/);
  });

  test('blocks when a check runs out of time', () => {
    const root = makeRepo({ test: 'setTimeout(() => {}, 4000)' });
    const result = gate('git commit -m x', root, { PRE_COMMIT_GATE_TIMEOUT_MS: '1500' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /timed out/);
  });

  test('blocks when the hook input cannot be read', () => {
    const result = spawnSync(process.execPath, [hookPath('pre-commit-gate.mjs')], {
      input: 'not json',
      env: { ...process.env, CLAUDE_PROJECT_DIR: failing },
      encoding: 'utf8',
    });
    assert.equal(result.status, 2);
  });
});
