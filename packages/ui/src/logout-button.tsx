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
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={logOut} disabled={pending} className={className}>
      {pending ? 'Logging out…' : 'Log out'}
    </Button>
  );
}
