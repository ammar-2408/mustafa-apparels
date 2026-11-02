import { AUTH_MESSAGES } from '@mustafa/validators/auth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('../../lib/auth-client', () => ({ authClient: client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { LoginForm } from './login-form';
import { LogoutButton } from './logout-button';
import { CHECK_EMAIL, RegisterForm } from './register-form';

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
