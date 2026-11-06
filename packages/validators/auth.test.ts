import { describe, expect, it } from 'vitest';

import {
  AUTH_MESSAGES,
  authErrorMessage,
  backupCodeInput,
  fieldErrorsOf,
  forgotPasswordInput,
  PASSWORD_MAX,
  PASSWORD_MIN,
  resetPasswordInput,
  resetPasswordParams,
  signInInput,
  signUpInput,
  totpCodeInput,
  twoFactorSetupInput,
} from './auth';

const valid = {
  name: 'Ayesha Khan',
  email: 'Ayesha@Example.com ',
  password: 'correct horse battery',
};

describe('signUpInput', () => {
  it('accepts a valid sign-up and normalises the email', () => {
    expect(signUpInput.parse(valid).email).toBe('ayesha@example.com');
  });

  it.each([
    [PASSWORD_MIN - 1, false],
    [PASSWORD_MIN, true],
    [PASSWORD_MAX, true],
    [PASSWORD_MAX + 1, false],
  ])('a %i-character password passes: %s', (length, passes) => {
    expect(signUpInput.safeParse({ ...valid, password: 'p'.repeat(length) }).success).toBe(passes);
  });

  it('has no composition rules', () => {
    expect(signUpInput.safeParse({ ...valid, password: 'all lower case words' }).success).toBe(
      true,
    );
  });

  it.each([
    ['name', 'A'],
    ['name', 'x'.repeat(81)],
    ['email', 'not-an-email'],
    ['email', ''],
  ])('rejects %s = %j', (field, value) => {
    const result = signUpInput.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)).toHaveProperty(field);
  });

  it('refuses fields a client may not set, such as role', () => {
    expect(signUpInput.safeParse({ ...valid, role: 'admin' }).success).toBe(false);
    expect(signUpInput.safeParse({ ...valid, callbackURL: '/account' }).success).toBe(true);
  });
});

describe('signInInput', () => {
  it('needs an email and any non-empty password up to the maximum', () => {
    expect(signInInput.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true);
    expect(signInInput.safeParse({ email: 'a@example.com', password: '' }).success).toBe(false);
    expect(
      signInInput.safeParse({ email: 'a@example.com', password: 'x'.repeat(129) }).success,
    ).toBe(false);
    expect(
      signInInput.safeParse({ email: 'a@example.com', password: 'x', isAdmin: true }).success,
    ).toBe(false);
  });
});

describe('authErrorMessage', () => {
  it('gives the same text for a wrong password, an unknown email and a refused account', () => {
    const texts = [
      'INVALID_EMAIL_OR_PASSWORD',
      'USER_NOT_FOUND',
      'INVALID_PASSWORD',
      'BANNED_USER',
    ].map((code) => authErrorMessage({ code, status: 401 }));
    expect(new Set(texts)).toEqual(new Set([AUTH_MESSAGES.invalidCredentials]));
  });

  it('explains rate limits, unverified email and breached passwords', () => {
    expect(authErrorMessage({ status: 429 })).toBe(AUTH_MESSAGES.tooManyAttempts);
    expect(authErrorMessage({ code: 'EMAIL_NOT_VERIFIED', status: 403 })).toBe(
      AUTH_MESSAGES.verifyFirst,
    );
    expect(authErrorMessage({ code: 'PASSWORD_COMPROMISED', status: 400 })).toBe(
      AUTH_MESSAGES.breached,
    );
    expect(authErrorMessage({ code: 'PASSWORD_TOO_SHORT', status: 400 })).toBe(
      AUTH_MESSAGES.passwordLength,
    );
  });

  it('never shows an unknown server message', () => {
    expect(
      authErrorMessage({ code: 'SOMETHING_ELSE', message: 'db at 10.0.0.1 down', status: 500 }),
    ).toBe(AUTH_MESSAGES.generic);
    expect(authErrorMessage(null)).toBe(AUTH_MESSAGES.generic);
  });
});

describe('password reset forms', () => {
  it('asks for an email only', () => {
    expect(forgotPasswordInput.parse({ email: ' A@Example.com' }).email).toBe('a@example.com');
    expect(forgotPasswordInput.safeParse({ email: 'a@example.com', role: 'admin' }).success).toBe(
      false,
    );
  });

  it('applies the password policy to the new password and needs the token', () => {
    expect(
      resetPasswordInput.safeParse({ token: 't', newPassword: 'correct horse battery' }).success,
    ).toBe(true);
    expect(resetPasswordInput.safeParse({ token: 't', newPassword: 'short' }).success).toBe(false);
    expect(
      resetPasswordInput.safeParse({ token: '', newPassword: 'correct horse battery' }).success,
    ).toBe(false);
  });

  it('explains an expired or used link', () => {
    expect(authErrorMessage({ code: 'INVALID_TOKEN', status: 400 })).toBe(
      AUTH_MESSAGES.linkExpired,
    );
  });
});

describe('admin 2FA forms', () => {
  it('needs the password to start setup', () => {
    expect(twoFactorSetupInput.safeParse({ password: 'x' }).success).toBe(true);
    expect(twoFactorSetupInput.safeParse({ password: '' }).success).toBe(false);
  });

  it('takes a 6-digit code only', () => {
    expect(totpCodeInput.parse({ code: ' 123456 ' }).code).toBe('123456');
    for (const code of ['12345', '1234567', 'abcdef']) {
      expect(totpCodeInput.safeParse({ code }).success).toBe(false);
    }
  });

  it('takes a backup code with or without its dash', () => {
    expect(backupCodeInput.safeParse({ code: 'aB3dE-9fG2h' }).success).toBe(true);
    expect(backupCodeInput.safeParse({ code: 'aB3dE9fG2h' }).success).toBe(true);
    expect(backupCodeInput.safeParse({ code: 'short' }).success).toBe(false);
  });

  it('explains wrong, expired and locked codes', () => {
    expect(authErrorMessage({ code: 'INVALID_CODE', status: 401 })).toBe(AUTH_MESSAGES.wrongCode);
    expect(authErrorMessage({ code: 'INVALID_TWO_FACTOR_COOKIE', status: 401 })).toBe(
      AUTH_MESSAGES.loginExpired,
    );
    expect(authErrorMessage({ code: 'ACCOUNT_TEMPORARILY_LOCKED', status: 429 })).toBe(
      AUTH_MESSAGES.twoFactorLocked,
    );
  });
});

describe('resetPasswordParams', () => {
  it('accepts one usable token and no error', () => {
    expect(resetPasswordParams.safeParse({ token: 'abc' }).success).toBe(true);
    expect(resetPasswordParams.safeParse({ token: 'abc', utm_source: 'mail' }).success).toBe(true);
  });

  it.each([
    ['no token', {}],
    ['an empty token', { token: '' }],
    ['two tokens', { token: ['a', 'b'] }],
    ['a token too long', { token: 'x'.repeat(201) }],
    ['an error from the link check', { token: 'abc', error: 'INVALID_TOKEN' }],
  ])('refuses %s', (_name, params) => {
    expect(resetPasswordParams.safeParse(params).success).toBe(false);
  });
});
