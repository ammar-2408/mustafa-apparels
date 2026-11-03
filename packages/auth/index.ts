// Better Auth for both apps (docs/auth-security.md §1). Each app builds its instance lazily through
// its own lib/auth.ts, so `next build` never constructs one.
import { createHmac } from 'node:crypto';

import type { BreachCheck } from '@mustafa/core/integrations/breached-passwords';
import type { Mailer } from '@mustafa/core/integrations/email';
import {
  existingAccount,
  resetPassword,
  type Template,
  verifyEmail,
} from '@mustafa/core/integrations/email-templates';
import type { Limiter } from '@mustafa/core/integrations/rate-limit';
import type { Database } from '@mustafa/db/client';
import { uuidv7 } from '@mustafa/db/id';
import { account, session, twoFactor, user, verification } from '@mustafa/db/schema';
import { AUTH_MESSAGES, PASSWORD_MAX, PASSWORD_MIN, signUpInput } from '@mustafa/validators/auth';
import { APIError, betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware, getIP, isAPIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor as twoFactorPlugin } from 'better-auth/plugins/two-factor';
import { eq } from 'drizzle-orm';

import { type AuthApp, COOKIE_PREFIX } from './cookies';
import { LOGIN_FAILURES, loginKey, rateLimitOptions, tooManyAttempts } from './limits';

export { type AuthApp, COOKIE_PREFIX };

export type CreateAuthOptions = {
  app: AuthApp;
  db: Database;
  // NEXT_PUBLIC_SITE_URL on web, ADMIN_URL on admin.
  baseURL: string;
  secret: string;
  sendEmail: Mailer;
  // Leave out only in tests: without it, nothing is rate-limited.
  limiter?: Limiter;
  // Have I Been Pwned (packages/core/integrations/breached-passwords.ts).
  isBreached?: BreachCheck;
  // Runs slow work (emails) after the response, so timing never shows whether an account exists.
  background?: (task: Promise<unknown>) => void;
};

export { PASSWORD_MAX, PASSWORD_MIN };

const DAY = 60 * 60 * 24;

// Same code and text as Better Auth's own wrong-password error, so callers can't tell them apart.
export const invalidCredentials = () =>
  new APIError('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password',
  });

// Sessions keep an HMAC of the IP, never the address itself (docs/auth-security.md §7).
export const hashIp = (ip: string, secret: string) =>
  createHmac('sha256', secret).update(`ip:${ip}`).digest('hex');

export function createAuth({
  app,
  db,
  baseURL,
  secret,
  sendEmail,
  limiter,
  isBreached,
  background,
}: CreateAuthOptions) {
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
      // A verify link signs a customer in. On the admin it never could: see ADMIN_SESSION_PATHS.
      autoSignInAfterVerification: !admin,
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
    rateLimit: rateLimitOptions(limiter),
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // 2FA is the admin's only, and email verification the storefront's (docs/auth-security.md §1).
        if (!admin && ctx.path.startsWith('/two-factor')) throw notFound();
        if (admin && EMAIL_VERIFICATION_PATHS.has(ctx.path)) throw notFound();
        // The owner chose a code on every admin login (2026-11-02): no browser is ever trusted.
        if (admin && ctx.path.startsWith('/two-factor/') && ctx.body?.trustDevice) {
          throw new APIError('BAD_REQUEST', {
            code: 'TRUST_DEVICE_OFF',
            message: 'Trusted devices are turned off',
          });
        }
        // The same strict schema as the form: an unexpected field, such as role, is refused.
        if (ctx.path === '/sign-up/email' && !signUpInput.safeParse(ctx.body).success) {
          throw new APIError('BAD_REQUEST', {
            code: 'VALIDATION',
            message: 'Check the highlighted fields',
          });
        }
        const field = PASSWORD_FIELD[ctx.path];
        const password = field ? (ctx.body as Record<string, unknown> | undefined)?.[field] : null;
        if (isBreached && typeof password === 'string' && (await isBreached(password))) {
          throw new APIError('BAD_REQUEST', {
            code: 'PASSWORD_COMPROMISED',
            message: AUTH_MESSAGES.breached,
          });
        }
        if (limiter && ctx.path === '/sign-in/email') {
          const key = loginKey(clientIp(ctx), ctx.body?.email);
          const { allowed, retryAfter } = await limiter.check(LOGIN_FAILURES, key);
          if (!allowed) throw tooManyAttempts(retryAfter);
        }
      }),
      // Counts only wrong passwords, so a customer who logs in often is never locked out.
      after: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned;
        if (!limiter || ctx.path !== '/sign-in/email') return;
        if (isAPIError(returned) && returned.statusCode === 401) {
          await limiter.consume(LOGIN_FAILURES, loginKey(clientIp(ctx), ctx.body?.email));
        }
      }),
    },
    databaseHooks: {
      user: {
        update: {
          // Turning 2FA on (the first code at /setup-2fa) ends every session the account had,
          // so a password-only session from before setup can't become a full admin session.
          // Better Auth creates the new session for this browser right after this update.
          after: async (updated, ctx) => {
            if (!admin || ctx?.path !== '/two-factor/verify-totp') return;
            if (!(updated as { twoFactorEnabled?: boolean }).twoFactorEnabled) return;
            await db.delete(session).where(eq(session.userId, updated.id));
          },
        },
      },
      session: {
        create: {
          before: async (data, ctx) => {
            // On the admin, a session comes only from the password step or the 2FA code step.
            // Anything else that creates one (a verify link, a future endpoint, a direct call)
            // would skip 2FA, so it's refused.
            if (admin && !ADMIN_SESSION_PATHS.has(ctx?.path ?? '')) throw invalidCredentials();
            const [owner] = await db
              .select({ banned: user.banned, role: user.role })
              .from(user)
              .where(eq(user.id, data.userId));
            if (!owner || owner.banned) throw invalidCredentials();
            // The admin signs in admins only. This runs after the password check, so a customer
            // gets the wrong-password answer at the same speed (docs/auth-security.md §1).
            if (admin && owner.role !== 'admin') throw invalidCredentials();
            // And the storefront refuses admin accounts, which would skip 2FA there (ADR-020).
            if (!admin && owner.role === 'admin') throw invalidCredentials();
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
    plugins: [
      // Enabled on both instances so the types match, but the storefront answers 404 for it.
      twoFactorPlugin({
        issuer: 'Mustafa Apparels Admin',
        backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: 'encrypted' },
      }),
      // Must stay last: it sets cookies from server actions.
      nextCookies(),
    ],
  });
}

// Server-side calls through auth.api have no request, and so no IP.
const clientIp = (ctx: {
  request?: Request | undefined;
  context: { options: BetterAuthOptions };
}) => (ctx.request ? getIP(ctx.request, ctx.context.options) : null);

const notFound = () => new APIError('NOT_FOUND', { code: 'NOT_FOUND', message: 'Not found' });

const ADMIN_SESSION_PATHS = new Set([
  '/sign-in/email',
  '/two-factor/verify-totp',
  '/two-factor/verify-backup-code',
]);

const EMAIL_VERIFICATION_PATHS = new Set(['/send-verification-email', '/verify-email']);

// Where each endpoint carries the new password.
const PASSWORD_FIELD: Record<string, string> = {
  '/sign-up/email': 'password',
  '/reset-password': 'newPassword',
  '/change-password': 'newPassword',
};

const sessionFields = {
  app: { type: 'string', required: false, input: false },
} as const;

export type Auth = ReturnType<typeof createAuth>;
