'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from './button';

type LogoutButtonProps = {
  /** The app's auth client sign-out, so this package never depends on auth. */
  signOut: () => Promise<unknown>;
  /** Where to go once signed out. */
  redirectTo?: string;
  className?: string;
};

export function LogoutButton({ signOut, redirectTo = '/login', className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logOut() {
    setPending(true);
    await signOut();
    // No refresh() after a move: it re-renders the old page and can cancel the move (Next 16.4.5).
    router.replace(redirectTo);
  }

  return (
    <Button variant="secondary" onClick={logOut} disabled={pending} className={className}>
      {pending ? 'Logging out…' : 'Log out'}
    </Button>
  );
}
