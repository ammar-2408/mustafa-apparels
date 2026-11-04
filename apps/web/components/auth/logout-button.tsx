'use client';

import { LogoutButton as SharedLogoutButton } from '@mustafa/ui/logout-button';

import { authClient } from '../../lib/auth-client';

// Binds this app's auth client, so server pages can render the shared button.
export function LogoutButton() {
  return <SharedLogoutButton signOut={() => authClient.signOut()} />;
}
