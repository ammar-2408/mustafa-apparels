// Authorization helpers (docs/auth-security.md §1). They take the session the app already read,
// so they stay pure: the app's lib/auth.ts reads it from the request and calls these.
import { forbidden, unauthenticated } from '@mustafa/core/errors';

export type SessionData = {
  user: { id: string; role?: string | null; banned?: boolean | null };
  session: { app?: string | null };
};

// A session or UNAUTHENTICATED. A banned user counts as signed out.
export function requireUser<S extends SessionData>(current: S | null | undefined): S {
  if (!current || current.user.banned) throw unauthenticated();
  return current;
}

// Every query for user-owned data also filters by the session's user id; this is the check
// for a row that was loaded some other way. Never trust an id sent from the browser.
export function assertOwner(userId: string, resourceUserId: string | null | undefined) {
  if (userId !== resourceUserId) throw forbidden();
}
