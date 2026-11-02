import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv as parseDotenv } from 'node:util';

import { ESLint } from 'eslint';
import { getFileInfo } from 'prettier';
import { test } from 'vitest';

import { ENV_NAMES, parseEnv } from '../packages/config/env.ts';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const fromRoot = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));

const eslint = new ESLint({ cwd: fromRoot('') });
const prettierIgnores = async (file) => {
  const ignorePath = [fromRoot('.gitignore'), fromRoot('.prettierignore')];
  return (await getFileInfo(fromRoot(file), { ignorePath })).ignored;
};

const exampleEnv = () => parseDotenv(read('.env.example'));
const ciEnv = () => {
  const block = read('.github/workflows/ci.yml').match(/^env:\n((?: {2}.*\n)+)/m)?.[1] ?? '';
  return parseDotenv(block.replace(/^ {2}(\w+): /gm, '$1=').replace(/ # .*$/gm, ''));
};

test('.env.example lists exactly the validated variables', () => {
  assert.deepEqual(Object.keys(exampleEnv()).sort(), [...ENV_NAMES].sort());
});

test('.env.example has the real shop details, not the kit placeholders', () => {
  const example = read('.env.example');
  assert.ok(!example.includes('<SHOP_NAME>'));
  assert.ok(!example.includes('.netlify.app'));
  assert.ok(!example.includes('onboarding@resend.dev'));
  assert.ok(example.includes('https://mustafaapparels.com'));
  assert.ok(example.includes('https://admin.mustafaapparels.com'));
  assert.ok(example.includes('no-reply@updates.mustafaapparels.com'));
});

const netlifyValue = (app, key) =>
  (
    read(`apps/${app}/netlify.toml`).match(
      new RegExp(`^\\s*${key}\\s*=\\s*"(.*)"\\s*$`, 'm'),
    )?.[1] ?? ''
  ).replaceAll('\\"', '"');

for (const [app, otherApp] of [
  ['web', 'admin'],
  ['admin', 'web'],
]) {
  test(`Netlify builds ${app} through its build script, so check-env always runs`, () => {
    // Only the storefront migrates, so a deploy migrates once (docs/deployment.md §2).
    const migrate = app === 'web' ? 'pnpm db:migrate && ' : '';
    assert.equal(netlifyValue(app, 'command'), `${migrate}pnpm turbo build --filter=${app}`);
    assert.match(
      readJson(`apps/${app}/package.json`).scripts.build,
      /check-env\.mjs .*&& next build/,
    );
  });

  test(`Netlify publishes ${app} from its own .next folder`, () => {
    assert.equal(netlifyValue(app, 'publish'), `apps/${app}/.next`);
  });

  test(`Netlify skips ${app} unless its own or shared files changed`, () => {
    const [skipCheck, paths] = netlifyValue(app, 'ignore').split(' -- ');
    assert.equal(
      skipCheck,
      '[ "$CACHED_COMMIT_REF" != "$COMMIT_REF" ] && git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF',
    );
    assert.deepEqual(paths.split(' '), [
      `:/apps/${app}`,
      ':/packages',
      ':/package.json',
      ':/pnpm-lock.yaml',
      ':/pnpm-workspace.yaml',
      ':/turbo.json',
      ':/.nvmrc',
    ]);
    assert.ok(!paths.includes(`apps/${otherApp}`));
  });
}

for (const app of /** @type {const} */ (['web', 'admin'])) {
  test(`a fresh copy of .env.example is valid for ${app}`, () => {
    parseEnv(app, exampleEnv());
  });

  test(`CI's env is valid for ${app}`, () => {
    parseEnv(app, ciEnv());
  });

  for (const script of ['dev', 'build', 'start']) {
    test(`${app} checks env before "${script}"`, () => {
      const { scripts } = readJson(`apps/${app}/package.json`);
      assert.match(scripts[script], new RegExp(`^node .*check-env\\.mjs ${app} && next ${script}`));
    });
  }

  test(`${app} typecheck runs without env, so commits never need secrets`, () => {
    assert.ok(!readJson(`apps/${app}/package.json`).scripts.typecheck.includes('check-env'));
  });

  test(`${app} loads the root env file from its Next config`, () => {
    assert.match(read(`apps/${app}/next.config.ts`), /loadEnvFiles\(\)/);
  });

  test(`${app} doesn't announce Next.js in a response header`, () => {
    assert.match(read(`apps/${app}/next.config.ts`), /poweredByHeader: false/);
  });

  test(`${app} checks env again when its server starts, since Netlify never runs check-env`, () => {
    const source = read(`apps/${app}/instrumentation.ts`);
    assert.match(source, /export async function register\(\)/);
    assert.match(source, new RegExp(`getEnv\\('${app}'\\)`));
  });

  test(`${app} sets its robots header from its Next config`, () => {
    assert.match(read(`apps/${app}/next.config.ts`), new RegExp(`robotsHeaders\\('${app}'\\)`));
  });
}

for (const task of ['build', 'dev']) {
  test(`turbo passes every variable through to "${task}"`, () => {
    const { env } = readJson('turbo.json').tasks[task];
    assert.deepEqual([...env].sort(), [...ENV_NAMES].sort());
  });
}

test('turbo rebuilds when the root or app env file changes', () => {
  const { globalDependencies, tasks } = readJson('turbo.json');
  assert.ok(globalDependencies.includes('.env.local'));
  assert.deepEqual(tasks.build.inputs, ['$TURBO_DEFAULT$', '.env.local']);
});

// Every task the given one depends on, directly or not, from Turbo's own task graph.
const turboTaskDeps = (task, filter) => {
  const dry = spawnSync(`pnpm turbo run ${task} --filter=${filter} --dry=json`, {
    cwd: fromRoot(''),
    shell: true,
    encoding: 'utf8',
  });
  assert.equal(dry.status, 0, dry.stderr);
  const tasks = new Map(JSON.parse(dry.stdout).tasks.map((t) => [t.taskId, t.dependencies]));
  const seen = new Set();
  const walk = (id) => {
    for (const dep of tasks.get(id) ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      walk(dep);
    }
  };
  walk(`${filter}#${task}`);
  return [...seen];
};

for (const task of ['lint', 'typecheck', 'test']) {
  test(`turbo re-runs "${task}" in an app when a workspace package it uses changes`, () => {
    for (const app of ['web', 'admin']) {
      assert.ok(
        turboTaskDeps(task, app).some((id) => id.startsWith('@mustafa/config#')),
        `${app}#${task} does not depend on @mustafa/config, so its cache ignores package changes`,
      );
    }
  });
}

test('turbo lets the env check see the Netlify deploy context', () => {
  assert.deepEqual(readJson('turbo.json').tasks.build.passThroughEnv, ['NETLIFY', 'CONTEXT']);
});

test('root package is private and pins the pnpm version CI uses', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.packageManager, 'pnpm@12.16.1');
});

test('.nvmrc pins Node 24, the newest LTS Netlify functions can run in production', () => {
  assert.equal(read('.nvmrc').trim(), '24');
});

test('workspace includes apps and packages', () => {
  const workspace = read('pnpm-workspace.yaml');
  assert.match(workspace, /^\s*-\s*["']?apps\/\*["']?\s*$/m);
  assert.match(workspace, /^\s*-\s*["']?packages\/\*["']?\s*$/m);
});

for (const task of ['dev', 'build', 'lint', 'typecheck', 'test']) {
  test(`root "${task}" script runs the Turbo task of the same name`, () => {
    const { scripts } = readJson('package.json');
    assert.match(scripts[task] ?? '', new RegExp(`turbo run ${task}$`));
    assert.ok(readJson('turbo.json').tasks[task], `turbo.json has no "${task}" task`);
  });
}

test('root db scripts run the @mustafa/db package scripts', () => {
  const { scripts } = readJson('package.json');
  assert.equal(scripts['db:generate'], 'pnpm --filter @mustafa/db generate');
  assert.equal(scripts['db:migrate'], 'pnpm --filter @mustafa/db migrate');
  assert.equal(scripts['db:seed'], 'pnpm --filter @mustafa/db seed');
});

test('CI "e2e" job seeds the demo suits after migrating and before the E2E run', () => {
  const block = ciJob('e2e');
  const migrateAt = block.indexOf('- run: pnpm db:migrate');
  const seedAt = block.indexOf('- run: pnpm db:seed -- --e2e');
  assert.ok(seedAt > migrateAt && migrateAt >= 0, 'seed --e2e must come after migrate');
  assert.ok(seedAt < block.indexOf('- run: pnpm test:e2e'));
});

const ciJob = (job) => {
  const yml = read('.github/workflows/ci.yml');
  const start = yml.indexOf(`\n  ${job}:\n`);
  assert.ok(start >= 0, `CI has no "${job}" job`);
  const next = yml.slice(start + 1).search(/\n {2}\w[\w-]*:\n/);
  return next < 0 ? yml.slice(start) : yml.slice(start, start + 1 + next);
};

for (const [job, before] of [
  ['quality', 'pnpm test'],
  ['e2e', 'pnpm build'],
]) {
  test(`CI "${job}" job migrates a Postgres 18 container, like Neon, before "${before}"`, () => {
    const block = ciJob(job);
    assert.match(block, /services:\n\s+postgres:\n\s+image: postgres:18\n/);
    assert.match(block, /--health-cmd "pg_isready/);
    const migrateAt = block.indexOf('- run: pnpm db:migrate');
    assert.ok(migrateAt >= 0, `"${job}" never runs pnpm db:migrate`);
    assert.ok(migrateAt < block.indexOf(`- run: ${before}`), `"${job}" migrates after ${before}`);
  });
}

test("CI's database URLs point at its own Postgres container", () => {
  const env = ciEnv();
  for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
    assert.equal(env[name], 'postgresql://postgres:postgres@localhost:5432/shop_test');
  }
});

test('root test script runs the workspace project through Vitest', () => {
  const { scripts } = readJson('package.json');
  assert.doesNotMatch(scripts.test, /node --test/);
  assert.match(scripts.test, /^vitest run --project workspace && /);
});

test('root verify script runs lint, typecheck, test and build, stopping at the first failure', () => {
  const { scripts } = readJson('package.json');
  assert.equal(scripts.verify, 'pnpm lint && pnpm typecheck && pnpm test && pnpm build');
});

for (const pkg of [
  'apps/web',
  'apps/admin',
  'packages/config',
  'packages/db',
  'packages/core',
  'packages/validators',
  'packages/auth',
]) {
  test(`${pkg} tests run through Vitest with coverage`, () => {
    assert.equal(readJson(`${pkg}/package.json`).scripts.test, 'vitest run --coverage');
  });
}

test('root Vitest config covers the apps, the packages and the workspace tests', async () => {
  const { default: config } = await import('../vitest.config.mjs');
  const { projects = [] } = config.test ?? {};
  assert.ok(projects.includes('apps/*'));
  assert.ok(projects.includes('packages/*'));
  assert.ok(
    projects.some(
      (project) =>
        typeof project === 'object' && 'test' in project && project.test?.name === 'workspace',
    ),
  );
});

test('dev is uncached and persistent', () => {
  const { dev } = readJson('turbo.json').tasks;
  assert.equal(dev.cache, false);
  assert.equal(dev.persistent, true);
});

test('build caches Next.js output but not its cache folder', () => {
  const { outputs } = readJson('turbo.json').tasks.build;
  assert.ok(outputs.includes('.next/**'));
  assert.ok(outputs.includes('!.next/cache/**'));
});

test('.gitignore keeps dependencies, Turbo cache, secrets and owner files out of git', () => {
  const lines = read('.gitignore').split(/\r?\n/);
  for (const entry of [
    'node_modules/',
    '.turbo/',
    'next-env.d.ts',
    '.env',
    '.env.*',
    '!.env.example',
    'Business data/',
  ]) {
    assert.ok(lines.includes(entry), `.gitignore is missing "${entry}"`);
  }
});

test('.gitignore keeps the AGENTS.md that next dev writes in each app out of git', () => {
  const lines = read('.gitignore').split(/\r?\n/);
  assert.ok(lines.includes('apps/*/AGENTS.md'));
  assert.ok(!lines.includes('AGENTS.md'), 'the root AGENTS.md must stay tracked');
});

test('.gitattributes keeps YAML files on LF', () => {
  assert.ok(read('.gitattributes').split(/\r?\n/).includes('*.yaml text eol=lf'));
});

test('root ESLint applies a11y rules to UI code only', async () => {
  const rule = 'jsx-a11y/anchor-is-valid';
  for (const file of [
    'apps/web/app/page.tsx',
    'apps/admin/app/page.tsx',
    'packages/ui/button.tsx',
  ]) {
    const { rules } = await eslint.calculateConfigForFile(file);
    assert.ok(rules[rule], `${file} should have ${rule}`);
  }
  const { rules } = await eslint.calculateConfigForFile('scripts/x.mjs');
  assert.equal(rules[rule], undefined);
});

test('format hook leaves sorted imports in Prettier style', () => {
  const probe = 'scripts/hook-probe.tmp.mjs';
  writeFileSync(fromRoot(probe), "import { z, a } from './b.mjs';\nexport { a, z };\n");
  try {
    spawnSync(process.execPath, [fromRoot('.claude/hooks/format-file.mjs')], {
      cwd: fromRoot(''),
      env: { ...process.env, CLAUDE_PROJECT_DIR: fromRoot('') },
      input: JSON.stringify({ tool_input: { file_path: probe } }),
    });
    assert.equal(read(probe), "import { a, z } from './b.mjs';\nexport { a, z };\n");
  } finally {
    rmSync(fromRoot(probe));
  }
});

test('root ESLint looks for Next.js routes inside the apps', async () => {
  const { settings } = await eslint.calculateConfigForFile('apps/web/app/page.tsx');
  assert.deepEqual(settings.next.rootDir, ['apps/*/']);
});

const lintLinkToHome = (cwd, app) =>
  spawnSync(
    process.execPath,
    [
      fromRoot('node_modules/eslint/bin/eslint.js'),
      '--format',
      'json',
      '--stdin',
      '--stdin-filename',
      fromRoot(`${app}/app/link-probe.tsx`),
    ],
    {
      cwd: fromRoot(cwd),
      encoding: 'utf8',
      input: 'export const A = () => <a href="/">Home</a>;\n',
    },
  );

for (const [where, cwd, app] of [
  ['the repo root', '', 'apps/web'],
  ['apps/web', 'apps/web', 'apps/web'],
  ['the repo root', '', 'apps/admin'],
  ['apps/admin', 'apps/admin', 'apps/admin'],
]) {
  test(`ESLint from ${where} flags a plain link in ${app}, with no missing-pages warning`, () => {
    const { stdout, stderr } = lintLinkToHome(cwd, app);
    assert.doesNotMatch(stdout + stderr, /Pages directory cannot be found/);
    const [{ messages }] = JSON.parse(stdout);
    assert.ok(messages.some((m) => m.ruleId === '@next/next/no-html-link-for-pages'));
  });
}

for (const [app, port] of [
  ['web', 3000],
  ['admin', 3001],
]) {
  test(`${app} serves on port ${port}`, () => {
    const { scripts } = readJson(`apps/${app}/package.json`);
    assert.ok(scripts.dev.endsWith(`next dev --port ${port}`), scripts.dev);
    assert.ok(scripts.start.endsWith(`next start --port ${port}`), scripts.start);
  });
}

const playwrightConfig = async () => (await import('../playwright.config.ts')).default;

test('Playwright has the device projects from docs/testing-qa.md', async () => {
  const { projects = [] } = await playwrightConfig();
  const summary = Object.fromEntries(
    projects.map(({ name, use }) => [name, [use?.defaultBrowserType, use?.viewport]]),
  );
  assert.deepEqual(summary, {
    'mobile-small': ['chromium', { width: 360, height: 780 }],
    'mobile-ios': ['webkit', { width: 393, height: 659 }],
    tablet: ['webkit', { width: 810, height: 1080 }],
    'tablet-landscape': ['webkit', { width: 1080, height: 810 }],
    laptop: ['chromium', { width: 1366, height: 768 }],
    desktop: ['firefox', { width: 1920, height: 1080 }],
    large: ['chromium', { width: 2560, height: 1440 }],
  });
});

test('mobile-small behaves like an Android phone', async () => {
  const { projects = [] } = await playwrightConfig();
  const use = projects.find(({ name }) => name === 'mobile-small')?.use;
  assert.match(use?.userAgent ?? '', /Android/);
  assert.equal(use?.hasTouch, true);
});

test('Playwright reuses running servers on both ports, except on CI', async () => {
  const webServer = [(await playwrightConfig()).webServer ?? []].flat();
  assert.deepEqual(
    webServer.map(({ url }) => url),
    ['http://localhost:3000', 'http://localhost:3001'],
  );
  for (const server of webServer) {
    assert.equal(server.reuseExistingServer, !process.env.CI);
  }
});

test('root scripts run E2E and check the e2e folder, the scripts and the Claude Code hooks', () => {
  const { scripts } = readJson('package.json');
  assert.equal(scripts['test:e2e'], 'playwright test');
  assert.match(scripts.lint, /^eslint e2e playwright\.config\.ts scripts \.claude\/hooks && /);
  assert.match(scripts.typecheck, /^tsc -p e2e && tsc -p scripts && /);
});

test('scripts typecheck covers their JS and the Claude Code hooks', () => {
  const { compilerOptions, include } = readJson('scripts/tsconfig.json');
  assert.equal(compilerOptions.checkJs, true);
  assert.ok(include.includes('../.claude/hooks/*.mjs'));
});

const commitlint = (message) =>
  spawnSync(process.execPath, [fromRoot('node_modules/@commitlint/cli/cli.js')], {
    cwd: fromRoot(''),
    encoding: 'utf8',
    input: message,
  });

for (const message of [
  'feat(web): add product image gallery',
  'docs: note the coverage floor',
  'chore(config): add a hook\n\nExplains why.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>',
  `fix(web): ${'a'.repeat(72)}`,
]) {
  test(`commitlint accepts "${message.split('\n')[0]}"`, () => {
    const { status, stdout, stderr } = commitlint(message);
    assert.equal(status, 0, stdout + stderr);
  });
}

for (const [problem, message, rule] of [
  ['no type', 'add product image gallery', 'type-empty'],
  ['an unknown type', 'feature(web): add gallery', 'type-enum'],
  ['an unknown scope', 'feat(shop): add gallery', 'scope-enum'],
  ['a subject over 72 characters', `fix(web): ${'a'.repeat(73)}`, 'subject-max-length'],
]) {
  test(`commitlint rejects a message with ${problem}`, () => {
    const { status, stdout, stderr } = commitlint(message);
    assert.notEqual(status, 0);
    assert.match(stdout + stderr, new RegExp(rule));
  });
}

// Claude Code permission rules: `Bash(<glob>)` where `*` matches anything.
const permissions = () => readJson('.claude/settings.json').permissions;
const bashRuleMatches = (rules, command) =>
  rules.some((rule) => {
    const glob = rule.match(/^Bash\((.*)\)$/)?.[1];
    if (glob === undefined) return false;
    const pattern = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
    return new RegExp(`^${pattern}$`).test(command);
  });

for (const command of [
  'git diff --no-index /dev/null .env.local',
  'git diff --stat --no-index a .env',
  'git switch main',
  'git switch -c main',
  'git checkout main',
  'git push origin main',
  'git push -u origin main',
  'git push origin HEAD:main',
  'git push origin develop:main',
]) {
  test(`Claude Code is denied "${command}"`, () => {
    assert.ok(bashRuleMatches(permissions().deny, command));
  });
}

for (const command of ['pnpm add left-pad', 'pnpm add -D msw', 'npx -y skills add some/skill']) {
  test(`Claude Code asks before "${command}": a new dependency or skill is a decision`, () => {
    const { allow, ask } = permissions();
    assert.equal(bashRuleMatches(allow, command), false);
    assert.ok(bashRuleMatches(ask, command));
  });
}

test('the protect-files hook also checks shell commands', () => {
  const { PreToolUse } = readJson('.claude/settings.json').hooks;
  const bash = PreToolUse.find((entry) => entry.matcher === 'Bash');
  assert.ok(bash.hooks.some((hook) => hook.args?.[0]?.endsWith('/protect-files.mjs')));
});

test('Claude Code asks before a bare git push, which follows whatever branch is checked out', () => {
  assert.equal(bashRuleMatches(permissions().allow, 'git push'), false);
});

for (const command of ['git push origin develop', 'git diff --stat', 'git switch develop']) {
  test(`Claude Code can still run "${command}" without asking`, () => {
    const { allow, deny } = permissions();
    assert.ok(bashRuleMatches(allow, command));
    assert.equal(bashRuleMatches(deny, command), false);
  });
}

test('Claude Code is denied reading every non-example env file name the docs mention', () => {
  const { deny } = permissions();
  for (const name of [
    '.env',
    '.env.local',
    '.env.*.local',
    '.env.development',
    '.env.production',
  ]) {
    for (const dir of ['./', './**/']) {
      assert.ok(deny.includes(`Read(${dir}${name})`), `Read(${dir}${name})`);
    }
  }
  for (const name of ['.env.test', '.env.preview', '.env.staging']) {
    for (const dir of ['./', './**/']) {
      assert.ok(deny.includes(`Read(${dir}${name})`), `Read(${dir}${name})`);
    }
  }
});

test('installing the workspace installs the git hooks', () => {
  assert.equal(readJson('package.json').scripts.prepare, 'husky || exit 0');
});

test('git hooks run lint-staged, typecheck and commitlint', () => {
  assert.equal(read('.husky/pre-commit').trim(), 'pnpm exec lint-staged && pnpm typecheck');
  assert.equal(read('.husky/commit-msg').trim(), 'pnpm exec commitlint --edit "$1"');
});

test('.gitattributes keeps the git hooks on LF', () => {
  assert.ok(read('.gitattributes').split(/\r?\n/).includes('.husky/* text eol=lf'));
});

test('lint-staged runs ESLint before Prettier on code, and only Prettier on other text', async () => {
  const { default: config } = await import('../lint-staged.config.mjs');
  assert.deepEqual(config, {
    '*.{js,mjs,cjs,ts,tsx}': [
      'eslint --fix --no-warn-ignored --max-warnings 0',
      'prettier --write',
    ],
    '*.{json,md,yml,yaml,css}': 'prettier --write --ignore-unknown',
  });
});

test('root ESLint ignores owner files and build output', async () => {
  for (const file of ['Business data/x.ts', 'apps/web/.next/x.js', '.claude/skills/x/y.mjs']) {
    assert.equal(await eslint.isPathIgnored(file), true, `${file} should be ignored`);
  }
  assert.equal(await eslint.isPathIgnored('.claude/hooks/lib.mjs'), false);
});

test('Prettier leaves docs, stock, owner files and generated files alone', async () => {
  const ignored = [
    'Business data/x.json',
    'docs/x.md',
    'AGENTS.md',
    'catalog/dhanak/x.md',
    '.claude/skills/x/y.mjs',
    'mustafa-apparels-logos/x.json',
    'pnpm-lock.yaml',
    'skills-lock.json',
  ];
  for (const file of ignored) {
    assert.equal(await prettierIgnores(file), true, `${file} should be ignored`);
  }
});

test('Prettier still formats code and config files', async () => {
  for (const file of [
    'scripts/x.mjs',
    '.claude/hooks/lib.mjs',
    '.github/workflows/ci.yml',
    'pnpm-workspace.yaml',
  ]) {
    assert.equal(await prettierIgnores(file), false, `${file} should be formatted`);
  }
});
