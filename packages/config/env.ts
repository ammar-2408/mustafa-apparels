// Env validation for both apps. Who needs what: docs/setup.md §6.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { z } from 'zod';

export type App = 'web' | 'admin';

const secret = z.string().min(32, 'must be at least 32 characters');
const postgresUrl = z.url({ protocol: /^postgres(ql)?$/, error: 'must be a postgresql:// URL' });
const httpUrl = z.url({ protocol: /^https?$/, error: 'must be an http(s) URL' });
const email = z.email('must be an email address');
const sender = z
  .string()
  .regex(
    /^([^<>]+<[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/,
    'must be "Name <email>" or an email',
  );

const schema = z.object({
  APP_ENV: z.enum(['development', 'test', 'preview', 'production']).optional(),
  INTEGRATIONS_MODE: z.enum(['live', 'mock']).default('live'),
  NEXT_PUBLIC_SITE_URL: httpUrl.optional(),
  SITE_INDEXABLE: z.enum(['true', 'false']).optional(),
  WEB_URL: httpUrl.optional(),
  ADMIN_URL: httpUrl.optional(),
  DATABASE_URL: postgresUrl.optional(),
  DATABASE_URL_UNPOOLED: postgresUrl.optional(),
  BETTER_AUTH_SECRET: secret.optional(),
  REVALIDATE_SECRET: secret.optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: sender.optional(),
  SHOP_INBOX_EMAIL: email.optional(),
  UPSTASH_REDIS_REST_URL: httpUrl.optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, 'must look like G-XXXXXXXXXX')
    .optional(),
  INDEXNOW_KEY: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

type Name = keyof typeof schema.shape;

export const ENV_NAMES = Object.keys(schema.shape) as Name[];

// Required in every mode.
const ALWAYS: Record<App, Name[]> = {
  web: ['APP_ENV', 'NEXT_PUBLIC_SITE_URL', 'SITE_INDEXABLE'],
  admin: ['APP_ENV', 'NEXT_PUBLIC_SITE_URL', 'SITE_INDEXABLE', 'WEB_URL', 'ADMIN_URL'],
};

const SERVICES: Name[] = [
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

// Required only in live mode, because the accounts are created phase by phase.
const LIVE_ONLY: Record<App, Name[]> = {
  web: SERVICES,
  admin: [...SERVICES, 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
};

const PUBLIC_URLS: Name[] = [
  'NEXT_PUBLIC_SITE_URL',
  'WEB_URL',
  'ADMIN_URL',
  'UPSTASH_REDIS_REST_URL',
];

const SECRETS = ['BETTER_AUTH_SECRET', 'REVALIDATE_SECRET'] as const;

// A secret from `openssl rand -base64 32` has around 30 distinct characters.
const MIN_DISTINCT_CHARACTERS = 16;

const isPublicHttps = (value: string) => {
  const { protocol, hostname } = new URL(value);
  return protocol === 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1';
};

export class EnvError extends Error {
  readonly names: string[];

  constructor(app: App, problems: Map<string, string>) {
    const lines = [...problems].map(([name, reason]) => `  ${name}: ${reason}`);
    super(`Invalid environment for ${app}:\n${lines.join('\n')}`);
    this.name = 'EnvError';
    this.names = [...problems.keys()];
  }
}

export function parseEnv(app: App, source: Record<string, string | undefined> = process.env) {
  // Blank counts as missing: the .env.example template has blank values.
  const present = Object.fromEntries(
    ENV_NAMES.flatMap((name) => {
      const value = source[name]?.trim();
      return value ? [[name, value]] : [];
    }),
  );
  const problems = new Map<string, string>();

  // Reasons come from this file's messages, so a value can never reach the output.
  const parsed = schema.safeParse(present);
  for (const issue of parsed.error?.issues ?? []) {
    problems.set(
      String(issue.path[0]),
      issue.code === 'invalid_value' ? 'is not an allowed value' : issue.message,
    );
  }

  const mode = present.INTEGRATIONS_MODE ?? 'live';
  const required = mode === 'mock' ? ALWAYS[app] : [...ALWAYS[app], ...LIVE_ONLY[app]];
  for (const name of required) {
    if (!present[name]) problems.set(name, 'is missing');
  }

  const { APP_ENV } = present;
  const hosted = APP_ENV === 'production' || APP_ENV === 'preview';
  if (APP_ENV === 'production' && mode === 'mock') {
    problems.set('INTEGRATIONS_MODE', 'must not be mock in production');
  }
  if (APP_ENV !== 'production' && present.SITE_INDEXABLE === 'true') {
    problems.set('SITE_INDEXABLE', 'can only be true in production');
  }
  if (APP_ENV === 'production') {
    for (const name of PUBLIC_URLS) {
      const value = present[name];
      if (value && !problems.has(name) && !isPublicHttps(value)) {
        problems.set(name, 'must be a public https URL in production');
      }
    }
    for (const name of SECRETS) {
      const value = present[name];
      if (!value || problems.has(name)) continue;
      if (/^ci-only/i.test(value)) {
        problems.set(name, 'must not be the CI placeholder in production');
      } else if (new Set(value).size < MIN_DISTINCT_CHARACTERS) {
        problems.set(name, 'is too predictable for production: generate a random one');
      }
    }
    if (present.BETTER_AUTH_SECRET && present.BETTER_AUTH_SECRET === present.REVALIDATE_SECRET) {
      problems.set('REVALIDATE_SECRET', 'must differ from BETTER_AUTH_SECRET');
    }
  }
  // With a database, auth runs, and Better Auth quietly falls back to a default secret in development.
  if (present.DATABASE_URL && !present.BETTER_AUTH_SECRET) {
    problems.set('BETTER_AUTH_SECRET', 'is needed whenever DATABASE_URL is set');
  }
  // Mock mode with a real database stays allowed on preview, until every service account exists.
  if (APP_ENV === 'preview' && present.DATABASE_URL && !present.REVALIDATE_SECRET) {
    problems.set('REVALIDATE_SECRET', 'is needed on a preview with a database');
  }
  // Every guard here trusts APP_ENV, so on Netlify it must match the real deploy context.
  if (source.NETLIFY === 'true') {
    const expected = source.CONTEXT === 'production' ? 'production' : 'preview';
    if (APP_ENV !== expected)
      problems.set('APP_ENV', `must be ${expected} in this Netlify context`);
  }
  if (hosted) {
    for (const name of ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const) {
      if (present[name]) problems.set(name, 'must not be set on a hosted site');
    }
    if (app === 'web' && present.CLOUDINARY_API_SECRET) {
      problems.set('CLOUDINARY_API_SECRET', 'must stay out of the storefront');
    }
  }

  if (problems.size > 0 || !parsed.success) throw new EnvError(app, problems);
  return { ...parsed.data, SITE_INDEXABLE: parsed.data.SITE_INDEXABLE === 'true' };
}

export type Env = ReturnType<typeof parseEnv>;

const checked = new Map<App, Env>();

// The one way app code reads server env: checked once per server, then reused.
// instrumentation.ts calls it at startup, because Netlify functions never run check-env.
export function getEnv(app: App): Env {
  let env = checked.get(app);
  if (!env) {
    env = parseEnv(app);
    checked.set(app, env);
  }
  return env;
}

// Next only reads env files from the app folder, but docs/setup.md §4 keeps .env.local in the root.
// process.loadEnvFile never overwrites a set value: hosting env wins, then the app file, then the root.
export function loadEnvFiles(appDir: string = process.cwd()) {
  const load = (file: string) => {
    if (existsSync(file)) process.loadEnvFile(file);
  };
  load(join(appDir, '.env.local'));

  let dir = appDir;
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
  if (dir !== appDir) load(join(dir, '.env.local'));
}
