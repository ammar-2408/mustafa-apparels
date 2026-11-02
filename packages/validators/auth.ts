// Sign-up and sign-in forms (docs/auth-security.md §1), shared by the browser and Better Auth's
// sign-up hook. Password policy: 10 to 128 characters, no composition rules.
import { z } from 'zod';

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Enter a valid email')
  .pipe(z.email('Enter a valid email'));

export const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`);

export const signUpInput = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80, 'Use at most 80 characters'),
    email,
    password,
    // Better Auth's client sends where the verification link should land.
    callbackURL: z.string().max(200).optional(),
  })
  .strict();

export const signInInput = z
  .object({
    email,
    password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX),
    callbackURL: z.string().max(200).optional(),
    rememberMe: z.boolean().optional(),
  })
  .strict();

export const forgotPasswordInput = z.object({ email }).strict();

export const resetPasswordInput = z
  .object({ token: z.string().min(1).max(200), newPassword: password })
  .strict();

// Admin 2FA: the password to start setup, then a 6-digit code or a backup code (xxxxx-xxxxx).
export const twoFactorSetupInput = z
  .object({ password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX) })
  .strict();

export const totpCodeInput = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'Enter the 6-digit code from your app'),
  })
  .strict();

export const backupCodeInput = z
  .object({
    code: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/,
        'Enter one of your backup codes, like abcde-12345',
      ),
  })
  .strict();

export type SignUpInput = z.infer<typeof signUpInput>;
export type SignInInput = z.infer<typeof signInInput>;

export const fieldErrorsOf = (error: z.ZodError) =>
  z.flattenError(error).fieldErrors as Record<string, string[]>;

export const AUTH_MESSAGES = {
  invalidCredentials: 'Email or password is incorrect.',
  verifyFirst: "Please verify your email first. We've sent you a new link.",
  tooManyAttempts: 'Too many attempts. Please try again in a few minutes.',
  breached:
    'This password has appeared in a data breach, so it isn’t safe to use. Please choose a different one.',
  linkExpired: 'This link has expired or was already used. Please ask for a new one.',
  resetSent:
    'If an account uses that email, we’ve sent a link to reset the password. It works for one hour.',
  wrongCode: 'That code didn’t work. Use the newest code from your app.',
  loginExpired: 'This login has expired. Please log in again.',
  twoFactorLocked: 'Too many wrong codes. Wait 15 minutes, then log in again.',
  passwordLength: `Use a password of ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`,
  generic: 'Something went wrong. Please try again.',
} as const;

const BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: AUTH_MESSAGES.invalidCredentials,
  USER_NOT_FOUND: AUTH_MESSAGES.invalidCredentials,
  INVALID_PASSWORD: AUTH_MESSAGES.invalidCredentials,
  CREDENTIAL_ACCOUNT_NOT_FOUND: AUTH_MESSAGES.invalidCredentials,
  BANNED_USER: AUTH_MESSAGES.invalidCredentials,
  EMAIL_NOT_VERIFIED: AUTH_MESSAGES.verifyFirst,
  PASSWORD_COMPROMISED: AUTH_MESSAGES.breached,
  PASSWORD_TOO_SHORT: AUTH_MESSAGES.passwordLength,
  PASSWORD_TOO_LONG: AUTH_MESSAGES.passwordLength,
  INVALID_TOKEN: AUTH_MESSAGES.linkExpired,
  INVALID_CODE: AUTH_MESSAGES.wrongCode,
  INVALID_BACKUP_CODE: AUTH_MESSAGES.wrongCode,
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: AUTH_MESSAGES.loginExpired,
  INVALID_TWO_FACTOR_COOKIE: AUTH_MESSAGES.loginExpired,
  ACCOUNT_TEMPORARILY_LOCKED: AUTH_MESSAGES.twoFactorLocked,
};

// One place turns Better Auth's errors into text, so no message ever says whether an account
// exists, and no server detail reaches the page.
export function authErrorMessage(
  error: { code?: string | undefined; status?: number; message?: string | undefined } | null,
) {
  if (!error) return AUTH_MESSAGES.generic;
  const known = error.code && BY_CODE[error.code];
  if (known) return known;
  return error.status === 429 ? AUTH_MESSAGES.tooManyAttempts : AUTH_MESSAGES.generic;
}
