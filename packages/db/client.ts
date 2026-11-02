// One Drizzle client for apps and scripts (docs/database.md §8).
// Neon hosts use Neon's serverless driver; anything else (CI's Postgres container, a local
// Postgres) uses node-postgres, because only Neon speaks the serverless driver's WebSocket protocol.
import { Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';

import * as schema from './schema';

export type Schema = typeof schema;
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

// Errors name the variable, never its value, which holds the password.
function parseUrl(url: string, name: string): URL {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') return parsed;
  } catch {
    // Fall through to the generic message.
  }
  throw new Error(`${name} is not a valid postgresql:// URL`);
}

export function createDb(url: string, name = 'DATABASE_URL') {
  const { hostname } = parseUrl(url, name);
  if (hostname.endsWith('.neon.tech')) {
    return drizzleNeon({ client: new NeonPool({ connectionString: url }), schema });
  }
  return drizzlePg({ client: new pg.Pool({ connectionString: url }), schema });
}

let cached: ReturnType<typeof createDb> | undefined;

// Apps use the pooled URL. Created on first use, so importing this never needs env.
export function getDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is missing');
  cached ??= createDb(url);
  return cached;
}
