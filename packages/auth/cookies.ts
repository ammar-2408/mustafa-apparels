// Session cookie names, apart from the rest of the auth code, so apps/admin/proxy.ts can use
// them without loading Better Auth's server. Different per app: on localhost both apps share
// one cookie jar, and in production each cookie stays host-only (docs/auth-security.md §1).
export type AuthApp = 'web' | 'admin';

export const COOKIE_PREFIX: Record<AuthApp, string> = { web: 'ma', admin: 'ma-admin' };
