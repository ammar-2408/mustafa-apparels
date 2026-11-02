import { AUTH_MESSAGES } from '@mustafa/validators/auth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('../../lib/auth-client', () => ({ authClient: client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { ForgotPasswordForm } from './forgot-password-form';
import { LoginForm } from './login-form';
import { LogoutButton } from './logout-button';
import { CHECK_EMAIL, RegisterForm } from './register-form';
import { PASSWORD_CHANGED, ResetPasswordForm } from './reset-password-form';

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  it('shows field errors and sends nothing when the form is empty', async () => {
    render(<LoginForm />);
    submit(/log in/i);
    expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    expect(screen.getByText('Enter your password')).toBeTruthy();
    expect(client.signIn.email).not.toHaveBeenCalled();
  });

  it('signs in with a normalised email and goes to the account page', async () => {
    client.signIn.email.mockResolvedValue({ data: {}, error: null });
    render(<LoginForm />);
    type('Email', ' Ayesha@Example.com ');
    type('Password', 'correct horse battery');
    submit(/log in/i);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/account'));
    expect(client.signIn.email).toHaveBeenCalledWith({
      email: 'ayesha@example.com',
      password: 'correct horse battery',
    });
  });

  it('shows the one generic message when the details are wrong', async () => {
    client.signIn.email.mockResolvedValue({
      data: null,
      error: {
        status: 401,
        code: 'INVALID_EMAIL_OR_PASSWORD',
        message: 'Invalid email or password',
      },
    });
    render(<LoginForm />);
    type('Email', 'ayesha@example.com');
    type('Password', 'wrong password');
    submit(/log in/i);
    expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.invalidCredentials);
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RegisterForm', () => {
  it('checks the password length before sending', async () => {
    render(<RegisterForm />);
    type('Name', 'Ayesha');
    type('Email', 'ayesha@example.com');
    type('Password', 'short');
    submit(/create account/i);
    expect(await screen.findByText('Use at least 10 characters')).toBeTruthy();
    expect(client.signUp.email).not.toHaveBeenCalled();
  });

  it('says to check email after signing up, whatever the server knows', async () => {
    client.signUp.email.mockResolvedValue({ data: {}, error: null });
    render(<RegisterForm />);
    type('Name', 'Ayesha');
    type('Email', 'ayesha@example.com');
    type('Password', 'correct horse battery');
    submit(/create account/i);
    expect((await screen.findByRole('status')).textContent).toBe(CHECK_EMAIL);
    expect(client.signUp.email).toHaveBeenCalledWith({
      name: 'Ayesha',
      email: 'ayesha@example.com',
      password: 'correct horse battery',
      callbackURL: '/account',
    });
  });

  it('shows a safe message when sign-up fails', async () => {
    client.signUp.email.mockResolvedValue({ data: null, error: { status: 429 } });
    render(<RegisterForm />);
    type('Name', 'Ayesha');
    type('Email', 'ayesha@example.com');
    type('Password', 'correct horse battery');
    submit(/create account/i);
    expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.tooManyAttempts);
  });
});

describe('LogoutButton', () => {
  it('signs out and goes to the login page', async () => {
    client.signOut.mockResolvedValue({});
    render(<LogoutButton />);
    submit(/log out/i);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(client.signOut).toHaveBeenCalled();
  });
});

describe('ForgotPasswordForm', () => {
  it('gives the same answer whether or not the email has an account', async () => {
    client.requestPasswordReset.mockResolvedValue({ data: { status: true }, error: null });
    render(<ForgotPasswordForm />);
    type('Email', 'Ayesha@Example.com');
    submit(/send reset link/i);
    expect((await screen.findByRole('status')).textContent).toBe(AUTH_MESSAGES.resetSent);
    expect(client.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ayesha@example.com',
      redirectTo: '/reset-password',
    });
  });

  it('still says only "sent" on a server error, but explains a rate limit', async () => {
    client.requestPasswordReset.mockResolvedValueOnce({ data: null, error: { status: 500 } });
    const { unmount } = render(<ForgotPasswordForm />);
    type('Email', 'ayesha@example.com');
    submit(/send reset link/i);
    expect((await screen.findByRole('status')).textContent).toBe(AUTH_MESSAGES.resetSent);
    unmount();

    client.requestPasswordReset.mockResolvedValueOnce({ data: null, error: { status: 429 } });
    render(<ForgotPasswordForm />);
    type('Email', 'ayesha@example.com');
    submit(/send reset link/i);
    expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.tooManyAttempts);
  });
});

describe('ResetPasswordForm', () => {
  it('sets the new password with the token from the link', async () => {
    client.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    render(<ResetPasswordForm token="abc" />);
    type('New password', 'a brand new passphrase');
    submit(/set new password/i);
    expect((await screen.findByRole('status')).textContent).toContain(PASSWORD_CHANGED);
    expect(client.resetPassword).toHaveBeenCalledWith({
      token: 'abc',
      newPassword: 'a brand new passphrase',
    });
  });

  it('checks the length first, and explains a used or expired link', async () => {
    render(<ResetPasswordForm token="abc" />);
    type('New password', 'short');
    submit(/set new password/i);
    expect(await screen.findByText('Use at least 10 characters')).toBeTruthy();
    expect(client.resetPassword).not.toHaveBeenCalled();

    client.resetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'INVALID_TOKEN' },
    });
    type('New password', 'a brand new passphrase');
    submit(/set new password/i);
    expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.linkExpired);
  });
});
