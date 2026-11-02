// Better Auth in the browser, for the auth forms only. It talks to /api/auth on this origin.
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
