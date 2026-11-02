// Better Auth's tables (1.7.15), checked against `npx auth generate` at step 3.2. The `user`
// table lives in ./user.ts. Field names must match Better Auth's, because its Drizzle adapter
// maps by them. Ours on top: session.app, and timestamps with time zone like every other table.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { createdAt, id, updatedAt } from './columns';
import { user } from './user';

const userId = () =>
  text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' });

const at = (name: string) => timestamp(name, { withTimezone: true });

export const session = pgTable(
  'session',
  {
    id: id(),
    userId: userId(),
    token: text('token').notNull().unique(),
    expiresAt: at('expires_at').notNull(),
    // An HMAC of the IP, never the raw address (docs/auth-security.md §7).
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    // Which app created it. The admin accepts only its own, so a storefront sign-in,
    // which has no 2FA, can never be replayed on the admin.
    app: text('app').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('session_user_id_idx').on(t.userId),
    check('session_app_known', sql`${t.app} IN ('web', 'admin')`),
  ],
);

export const account = pgTable(
  'account',
  {
    id: id(),
    userId: userId(),
    // For email and password: providerId 'credential' and accountId = the user's id.
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: at('access_token_expires_at'),
    refreshTokenExpiresAt: at('refresh_token_expires_at'),
    scope: text('scope'),
    // scrypt hash, salt:key in hex. Never the plain password.
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

// Email verification and password reset tokens.
export const verification = pgTable(
  'verification',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: at('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

// Admin TOTP. Secret and backup codes are encrypted with the admin's BETTER_AUTH_SECRET.
export const twoFactor = pgTable(
  'two_factor',
  {
    id: id(),
    userId: userId(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    verified: boolean('verified').default(true),
    failedVerificationCount: integer('failed_verification_count').default(0),
    lockedUntil: at('locked_until'),
  },
  (t) => [index('two_factor_user_id_idx').on(t.userId)],
);
