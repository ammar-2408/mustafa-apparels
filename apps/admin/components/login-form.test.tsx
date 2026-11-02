import { AUTH_MESSAGES } from '@mustafa/validators/auth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ signIn: { email: vi.fn() } }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('../lib/auth-client', () => ({ authClient: client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { LoginForm } from './login-form';

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => vi.clearAllMocks());

it('checks the fields before sending', async () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
  expect(await screen.findByText('Enter a valid email')).toBeTruthy();
  expect(client.signIn.email).not.toHaveBeenCalled();
});

it.each([
  ['asks for the code when 2FA is on', { twoFactorRedirect: true }, '/login/verify'],
  ['goes to 2FA setup on the first login', { user: {} }, '/setup-2fa'],
])('%s', async (_name, data, to) => {
  client.signIn.email.mockResolvedValue({ data, error: null });
  render(<LoginForm />);
  fill('Email', 'owner@example.com');
  fill('Password', 'correct horse battery');
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith(to));
});

it('shows the generic message for a refused account', async () => {
  client.signIn.email.mockResolvedValue({
    data: null,
    error: { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' },
  });
  render(<LoginForm />);
  fill('Email', 'ayesha@example.com');
  fill('Password', 'correct horse battery');
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
  expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.invalidCredentials);
});
