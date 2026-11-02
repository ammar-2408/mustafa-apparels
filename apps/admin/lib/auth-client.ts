// Better Auth in the admin's browser, for the login and 2FA pages only.
import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
