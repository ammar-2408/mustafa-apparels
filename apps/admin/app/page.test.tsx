import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('../lib/auth', () => ({
  requireAdminPage: async () => ({ user: { email: 'owner@example.com' } }),
}));
vi.mock('../lib/auth-client', () => ({ authClient: { signOut: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

import Dashboard from './page';

it('shows the dashboard to a signed-in admin, with a way to log out', async () => {
  render(await Dashboard());
  expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  expect(screen.getByText('Signed in as owner@example.com.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
});
