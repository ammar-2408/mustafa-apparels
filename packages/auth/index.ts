// Better Auth for both apps (docs/auth-security.md §1). Each app builds its instance lazily through
// its own lib/auth.ts, so `next build` never constructs one.
import { createHmac } from 'node:crypto';

import type { Mailer } from '@mustafa/core/integrations/email';
import {
  existingAccount,
  resetPassword,
  type Template,
  verifyEmail,
} from '@mustafa/core/integrations/email-templates';
import type { Database } from '@mustafa/db/client';
import { uuidv7 } from '@mustafa/db/id';
import { account, session, twoFactor, user, verification } from '@mustafa/db/schema';
import { PASSWORD_MAX, PASSWORD_MIN, signUpInput } from '@mustafa/validators/auth';
import { APIError, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';

export type AuthApp = 'web' | 'admin';

export type CreateAuthOptions = {
  app: AuthApp;
  db: Database;
  // NEXT_PUBLIC_SITE_URL on web, ADMIN_URL on admin.
  baseURL: string;
  secret: string;
  sendEmail: Mailer;
  // Runs slow work (emails) after the response, so timing never shows whether an account exists.
  background?: (task: Promise<unknown>) => void;
};

export { PASSWORD_MAX, PASSWORD_MIN };

const DAY = 60 * 60 * 24;

export const COOKIE_PREFIX: Record<AuthApp, string> = { web: 'ma', admin: 'ma-admin' };

// Same code and text as Better Auth's own wrong-password error, so callers can't tell them apart.
export const invalidCredentials = () =>
  new APIError('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password',
  });

// Sessions keep an HMAC of the IP, never the address itself (docs/auth-security.md §7).
export const hashIp = (ip: string, secret: string) =>
  createHmac('sha256', secret).update(`ip:${ip}`).digest('hex');

export function createAuth({ app, db, baseURL, secret, sendEmail, background }: CreateAuthOptions) {
  const admin = app === 'admin';
  // A failed send is logged by the mailer. The visitor sees the same answer either way, and can
  // ask again, so the request itself still succeeds.
  const send = async (kind: string, to: string, template: Template) => {
    await sendEmail({ kind, to, ...template });
  };
  return betterAuth({
    appName: admin ? 'Mustafa Apparels Admin' : 'Mustafa Apparels',
    baseURL,
    secret,
    trustedOrigins: [new URL(baseURL).origin],
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification, twoFactor },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: admin,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      // Sign-up never signs in, so it answers the same whether or not the email has an account.
      autoSignIn: false,
      // Customers confirm their email before the first login. The seeded admin is verified.
      requireEmailVerification: !admin,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        send('reset-password', user.email, resetPassword({ url })),
      // A sign-up with a registered email gets the normal answer; the inbox gets this instead.
      onExistingUserSignUp: ({ user }) =>
        send(
          'existing-account',
          user.email,
          existingAccount({ url: `${baseURL}/forgot-password` }),
        ),
    },
    emailVerification: {
      sendVerificationEmail: ({ user, url }) =>
        send('verify-email', user.email, verifyEmail({ url })),
      sendOnSignUp: !admin,
      // A login before confirming sends a fresh link.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: DAY,
    },
    user: {
      additionalFields: {
        // input: false, so a sign-up or profile update can't set them.
        role: { type: 'string', required: false, defaultValue: 'customer', input: false },
        phone: { type: 'string', required: false, input: false },
        banned: { type: 'boolean', required: false, defaultValue: false, input: false },
      },
    },
    session: admin
      ? { expiresIn: DAY / 2, disableSessionRefresh: true, additionalFields: sessionFields }
      : { expiresIn: 7 * DAY, updateAge: DAY, additionalFields: sessionFields },
    advanced: {
      // Different names per app: on localhost both apps share one cookie jar.
      cookiePrefix: COOKIE_PREFIX[app],
      // Better Auth drops Secure for an http base URL without a warning.
      useSecureCookies: baseURL.startsWith('https://'),
      database: { generateId: () => uuidv7() },
      // Netlify sets this header itself on every request.
      ipAddress: { ipAddressHeaders: ['x-nf-client-connection-ip'] },
      ...(background && { backgroundTasks: { handler: background } }),
    },
    hooks: {
      // The same strict schema as the form: an unexpected field, such as role, is refused outright.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email' && !signUpInput.safeParse(ctx.body).success) {
          throw new APIError('BAD_REQUEST', {
            code: 'VALIDATION',
            message: 'Check the highlighted fields',
          });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (data) => {
            const [owner] = await db
              .select({ banned: user.banned })
              .from(user)
              .where(eq(user.id, data.userId));
            if (!owner || owner.banned) throw invalidCredentials();
            return {
              data: {
                ...data,
                app,
                ipAddress: data.ipAddress ? hashIp(data.ipAddress, secret) : null,
              },
            };
          },
        },
      },
    },
    // Must stay last: it sets cookies from server actions.
    plugins: [nextCookies()],
  });
}

const sessionFields = {
  app: { type: 'string', required: false, input: false },
} as const;

export type Auth = ReturnType<typeof createAuth>;
