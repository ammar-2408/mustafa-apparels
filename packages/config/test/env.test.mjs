import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, test } from 'vitest';

import { ENV_NAMES, EnvError, getEnv, loadEnvFiles, parseEnv } from '../env.ts';

const SECRET = 'a-test-secret-that-is-long-enough-000000';

const shared = {
  APP_ENV: 'development',
  INTEGRATIONS_MODE: 'live',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  SITE_INDEXABLE: 'false',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/shop',
  DATABASE_URL_UNPOOLED: 'postgresql://user:password@localhost:5432/shop',
  BETTER_AUTH_SECRET: SECRET,
  REVALIDATE_SECRET: SECRET,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'cloud',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Mustafa Apparels <no-reply@updates.mustafaapparels.com>',
  SHOP_INBOX_EMAIL: 'shop@example.com',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token',
};
const web = shared;
const admin = {
  ...shared,
  WEB_URL: 'http://localhost:3000',
  ADMIN_URL: 'http://localhost:3001',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'cloudinary-secret-value',
};

const errorOf = (app, source) => {
  try {
    parseEnv(app, source);
  } catch (error) {
    assert.ok(error instanceof EnvError);
    return error;
  }
  return assert.fail('expected parseEnv to throw');
};
const without = (source, name) => {
  const copy = { ...source };
  delete copy[name];
  return copy;
};

test('a complete set passes for each app', () => {
  assert.equal(parseEnv('web', web).NEXT_PUBLIC_SITE_URL, 'http://localhost:3000');
  assert.equal(parseEnv('admin', admin).ADMIN_URL, 'http://localhost:3001');
});

test('SITE_INDEXABLE comes back as a boolean', () => {
  assert.equal(parseEnv('web', web).SITE_INDEXABLE, false);
});

test('INTEGRATIONS_MODE defaults to live, so unset hosting env is checked in full', () => {
  const source = without(without(web, 'INTEGRATIONS_MODE'), 'DATABASE_URL');
  assert.ok(errorOf('web', source).names.includes('DATABASE_URL'));
  assert.equal(parseEnv('web', without(web, 'INTEGRATIONS_MODE')).INTEGRATIONS_MODE, 'live');
});

const serviceVars = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'BETTER_AUTH_SECRET',
  'REVALIDATE_SECRET',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'SHOP_INBOX_EMAIL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

for (const name of serviceVars) {
  test(`${name}: missing or blank fails in live, missing passes in mock`, () => {
    assert.deepEqual(errorOf('web', without(web, name)).names, [name]);
    assert.deepEqual(errorOf('web', { ...web, [name]: '  ' }).names, [name]);
    const mock = { ...without(web, name), INTEGRATIONS_MODE: 'mock' };
    // With a database set, auth runs, so its secret stays required (tested below).
    parseEnv('web', name === 'BETTER_AUTH_SECRET' ? without(mock, 'DATABASE_URL') : mock);
  });
}

for (const name of ['APP_ENV', 'NEXT_PUBLIC_SITE_URL', 'SITE_INDEXABLE']) {
  test(`${name} is required even in mock`, () => {
    const source = { ...without(web, name), INTEGRATIONS_MODE: 'mock' };
    assert.deepEqual(errorOf('web', source).names, [name]);
  });
}

for (const name of ['WEB_URL', 'ADMIN_URL']) {
  test(`${name} is required on admin even in mock`, () => {
    const source = { ...without(admin, name), INTEGRATIONS_MODE: 'mock' };
    assert.deepEqual(errorOf('admin', source).names, [name]);
  });
}

for (const name of ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  test(`${name} is required on admin in live, optional in mock`, () => {
    assert.deepEqual(errorOf('admin', without(admin, name)).names, [name]);
    parseEnv('admin', { ...without(admin, name), INTEGRATIONS_MODE: 'mock' });
  });
}

test('mock still checks the values it is given', () => {
  const source = { ...web, INTEGRATIONS_MODE: 'mock', BETTER_AUTH_SECRET: 'short' };
  assert.deepEqual(errorOf('web', source).names, ['BETTER_AUTH_SECRET']);
});

test('web does not need the admin-only variables', () => {
  assert.equal(parseEnv('web', web).CLOUDINARY_API_SECRET, undefined);
});

test('GA4 and IndexNow are optional', () => {
  const { NEXT_PUBLIC_GA_MEASUREMENT_ID, INDEXNOW_KEY } = parseEnv('admin', admin);
  assert.equal(NEXT_PUBLIC_GA_MEASUREMENT_ID, undefined);
  assert.equal(INDEXNOW_KEY, undefined);
});

for (const [name, value] of [
  ['APP_ENV', 'staging'],
  ['INTEGRATIONS_MODE', 'fake'],
  ['SITE_INDEXABLE', 'yes'],
  ['NEXT_PUBLIC_SITE_URL', 'not a url'],
  ['DATABASE_URL', 'https://example.com/db'],
  ['BETTER_AUTH_SECRET', 'too-short'],
  ['REVALIDATE_SECRET', 'too-short'],
  ['EMAIL_FROM', 'not an email'],
  ['SHOP_INBOX_EMAIL', 'not an email'],
  ['NEXT_PUBLIC_GA_MEASUREMENT_ID', 'UA-12345'],
]) {
  test(`${name} rejects "${value}"`, () => {
    assert.deepEqual(errorOf('web', { ...web, [name]: value }).names, [name]);
  });
}

const production = {
  ...web,
  APP_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: 'https://mustafaapparels.com',
  // Shaped like openssl rand -base64 32 output, and different from each other.
  BETTER_AUTH_SECRET: 'q3Vf8pZ0LxN2rT7wYb5KcD1mHs9JgE4uAo6iRe+Pk/Q=',
  REVALIDATE_SECRET: 'Zt8nW2xQ5vB1yL7cF4kM0pH9sD3gJ6rA+eU/oiTNbVw=',
};
const adminProduction = {
  ...admin,
  ...production,
  WEB_URL: 'https://mustafaapparels.com',
  ADMIN_URL: 'https://admin.mustafaapparels.com',
};

test('a correct production set passes on admin', () => {
  assert.equal(parseEnv('admin', adminProduction).APP_ENV, 'production');
});

for (const name of ['NEXT_PUBLIC_SITE_URL', 'WEB_URL', 'ADMIN_URL', 'UPSTASH_REDIS_REST_URL']) {
  for (const url of ['http://example.com', 'https://localhost:3000', 'https://127.0.0.1']) {
    test(`production refuses ${url} for ${name}`, () => {
      const names = errorOf('admin', { ...adminProduction, [name]: url }).names;
      assert.ok(names.includes(name), names.join());
    });
  }
}

test('BETTER_AUTH_URL is gone: auth uses the site URL on web and ADMIN_URL on admin', () => {
  assert.ok(!ENV_NAMES.includes('BETTER_AUTH_URL'));
});

for (const APP_ENV of ['development', 'test', 'preview']) {
  test(`a database needs BETTER_AUTH_SECRET in ${APP_ENV}, even in mock`, () => {
    const source = { ...without(web, 'BETTER_AUTH_SECRET'), APP_ENV, INTEGRATIONS_MODE: 'mock' };
    assert.ok(errorOf('web', source).names.includes('BETTER_AUTH_SECRET'));
  });
}

test('a preview with a database needs REVALIDATE_SECRET, and may stay in mock', () => {
  const preview = { ...web, APP_ENV: 'preview', INTEGRATIONS_MODE: 'mock' };
  assert.deepEqual(errorOf('web', without(preview, 'REVALIDATE_SECRET')).names, [
    'REVALIDATE_SECRET',
  ]);
  assert.equal(parseEnv('web', preview).INTEGRATIONS_MODE, 'mock');
});

test('development with a database still allows a missing REVALIDATE_SECRET in mock', () => {
  parseEnv('web', { ...without(web, 'REVALIDATE_SECRET'), INTEGRATIONS_MODE: 'mock' });
});

for (const name of ['BETTER_AUTH_SECRET', 'REVALIDATE_SECRET']) {
  test(`production refuses the CI placeholder for ${name}`, () => {
    const source = { ...production, [name]: 'ci-only-secret-not-used-anywhere-else-000000' };
    assert.deepEqual(errorOf('web', source).names, [name]);
  });

  test(`production refuses a low-variety ${name}`, () => {
    for (const value of ['a'.repeat(44), 'abcabcabcabcabcabcabcabcabcabcabc', SECRET]) {
      assert.deepEqual(errorOf('web', { ...production, [name]: value }).names, [name]);
    }
  });
}

test('production needs the two secrets to differ', () => {
  const source = { ...production, REVALIDATE_SECRET: production.BETTER_AUTH_SECRET };
  assert.deepEqual(errorOf('web', source).names, ['REVALIDATE_SECRET']);
});

test('the secret rules never print the secret', () => {
  const { message } = errorOf('web', { ...production, BETTER_AUTH_SECRET: 'x'.repeat(40) });
  assert.ok(!message.includes('x'.repeat(40)));
});

test('getEnv checks process.env once and reuses the result', () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, web);
    const first = getEnv('web');
    process.env.APP_ENV = 'not-a-valid-value';
    assert.equal(getEnv('web'), first);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test('getEnv throws the same EnvError as parseEnv on a bad set', () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { ...admin, ADMIN_URL: 'nope' });
    assert.throws(() => getEnv('admin'), EnvError);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test('on Netlify, the production context needs APP_ENV=production', () => {
  const netlify = { NETLIFY: 'true', CONTEXT: 'production' };
  assert.equal(parseEnv('web', { ...production, ...netlify }).APP_ENV, 'production');
  for (const APP_ENV of ['preview', 'development', 'test']) {
    const source = { ...web, ...netlify, APP_ENV, INTEGRATIONS_MODE: 'mock' };
    assert.deepEqual(errorOf('web', source).names, ['APP_ENV']);
  }
});

test('on Netlify, other contexts need APP_ENV=preview', () => {
  for (const CONTEXT of ['branch-deploy', 'deploy-preview']) {
    const netlify = { NETLIFY: 'true', CONTEXT };
    parseEnv('web', { ...web, ...netlify, APP_ENV: 'preview' });
    for (const APP_ENV of ['production', 'development', 'test']) {
      const names = errorOf('web', { ...production, ...netlify, APP_ENV }).names;
      assert.deepEqual(names, ['APP_ENV']);
    }
  }
});

test('a correct production set passes, and may be indexable', () => {
  assert.equal(parseEnv('web', { ...production, SITE_INDEXABLE: 'true' }).SITE_INDEXABLE, true);
});

test('mock is refused in production', () => {
  const source = { ...production, INTEGRATIONS_MODE: 'mock' };
  assert.deepEqual(errorOf('web', source).names, ['INTEGRATIONS_MODE']);
});

test('SITE_INDEXABLE=true is refused outside production', () => {
  for (const APP_ENV of ['development', 'test', 'preview']) {
    assert.deepEqual(errorOf('web', { ...web, APP_ENV, SITE_INDEXABLE: 'true' }).names, [
      'SITE_INDEXABLE',
    ]);
  }
});

test('production needs an https site URL', () => {
  const source = { ...production, NEXT_PUBLIC_SITE_URL: 'http://mustafaapparels.com' };
  assert.deepEqual(errorOf('web', source).names, ['NEXT_PUBLIC_SITE_URL']);
});

for (const APP_ENV of ['production', 'preview']) {
  const hosted = { ...production, APP_ENV };

  for (const name of ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD']) {
    test(`${name} is refused in ${APP_ENV}`, () => {
      assert.deepEqual(errorOf('web', { ...hosted, [name]: 'x' }).names, [name]);
    });
  }

  test(`the Cloudinary secret is refused on web in ${APP_ENV}`, () => {
    assert.deepEqual(errorOf('web', { ...hosted, CLOUDINARY_API_SECRET: 'x' }).names, [
      'CLOUDINARY_API_SECRET',
    ]);
  });
}

test('the Cloudinary secret is allowed on web locally, where one file serves both apps', () => {
  parseEnv('web', { ...web, CLOUDINARY_API_SECRET: 'x' });
});

test('error text never contains a value', () => {
  const secret = 'short-secret-value';
  const database = 'mysql://user:hunter2@localhost/shop';
  const { message } = errorOf('web', {
    ...web,
    BETTER_AUTH_SECRET: secret,
    DATABASE_URL: database,
  });
  assert.ok(message.includes('BETTER_AUTH_SECRET'));
  assert.ok(message.includes('DATABASE_URL'));
  assert.ok(!message.includes(secret));
  assert.ok(!message.includes('hunter2'));
});

test('every problem is reported at once', () => {
  const source = without(without(web, 'DATABASE_URL'), 'RESEND_API_KEY');
  assert.deepEqual(errorOf('web', source).names.sort(), ['DATABASE_URL', 'RESEND_API_KEY']);
});

test('ENV_NAMES lists every variable once', () => {
  assert.equal(new Set(ENV_NAMES).size, ENV_NAMES.length);
  for (const name of [...Object.keys(admin), 'INDEXNOW_KEY', 'SEED_ADMIN_EMAIL']) {
    assert.ok(ENV_NAMES.includes(name), `ENV_NAMES is missing ${name}`);
  }
});

const KEYS = ['MUSTAFA_TEST_A', 'MUSTAFA_TEST_B', 'MUSTAFA_TEST_C'];
const tempDirs = [];

const makeWorkspace = () => {
  const root = mkdtempSync(join(tmpdir(), 'env-test-'));
  tempDirs.push(root);
  const app = join(root, 'apps', 'web');
  mkdirSync(app, { recursive: true });
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  return { root, app };
};

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test('loadEnvFiles: real env beats the app file, and the app file beats the root file', () => {
  const { root, app } = makeWorkspace();
  writeFileSync(
    join(root, '.env.local'),
    'MUSTAFA_TEST_A=root\nMUSTAFA_TEST_B=root\nMUSTAFA_TEST_C=root\n',
  );
  writeFileSync(join(app, '.env.local'), 'MUSTAFA_TEST_A=app\nMUSTAFA_TEST_B=app\n');
  process.env.MUSTAFA_TEST_A = 'hosting';

  loadEnvFiles(app);

  assert.equal(process.env.MUSTAFA_TEST_A, 'hosting');
  assert.equal(process.env.MUSTAFA_TEST_B, 'app');
  assert.equal(process.env.MUSTAFA_TEST_C, 'root');
});

test('loadEnvFiles: no env files is not an error', () => {
  const { app } = makeWorkspace();
  loadEnvFiles(app);
  assert.equal(process.env.MUSTAFA_TEST_A, undefined);
});

const checkEnv = (app, env) =>
  spawnSync(process.execPath, [fileURLToPath(new URL('../check-env.mjs', import.meta.url)), app], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });

test('check-env exits 0 for a valid set', () => {
  const result = checkEnv('web', web);
  assert.equal(result.status, 0, result.stderr);
});

test('check-env exits 1, names the problem and says how to fix it', () => {
  const result = checkEnv('web', { ...web, APP_ENV: 'nope' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /APP_ENV/);
  assert.match(result.stderr, /cp \.env\.example \.env\.local/);
});

test('check-env rejects an unknown app', () => {
  const result = checkEnv('shop', web);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /web.*admin/);
});
