import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { LogoutButton } from './logout-button';

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
});

const click = () => fireEvent.click(screen.getByRole('button', { name: /log out/i }));

describe('LogoutButton', () => {
  it('signs out, then moves to the login page with no refresh (it can cancel the move)', async () => {
    const signOut = vi.fn().mockResolvedValue({});
    render(<LogoutButton signOut={signOut} />);
    click();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('goes where it is told', async () => {
    render(<LogoutButton signOut={vi.fn().mockResolvedValue({})} redirectTo="/" />);
    click();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('is disabled and says so while signing out', async () => {
    let finish: () => void = () => {};
    const signOut = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<LogoutButton signOut={signOut} />);
    click();
    const button = await screen.findByRole('button', { name: 'Logging out…' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    finish();
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });
});
