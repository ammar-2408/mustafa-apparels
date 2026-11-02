'use client';

import { Button } from '@mustafa/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '../lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logOut() {
    setPending(true);
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={logOut} disabled={pending}>
      {pending ? 'Logging out…' : 'Log out'}
    </Button>
  );
}
