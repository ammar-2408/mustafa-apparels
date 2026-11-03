// Authorization helpers (docs/auth-security.md §1). They take the session the app already read,
// so they stay pure: the app's lib/auth.ts reads it from the request and calls these.
import { forbidden, unauthenticated } from '@mustafa/core/errors';

export type SessionData = {
  user: { id: string; role?: string | null; banned?: boolean | null };
  session: { app?: string | null };
};

// A storefront session or UNAUTHENTICATED. A banned user counts as signed out, and so does an
// admin session or an admin account: the storefront never signs those in (ADR-020).
export function requireUser<S extends SessionData>(current: S | null | undefined): S {
  if (!current || current.user.banned) throw unauthenticated();
  if (current.session.app !== 'web' || current.user.role === 'admin') throw unauthenticated();
  return current;
}

// Every query for user-owned data also filters by the session's user id; this is the check
// for a row that was loaded some other way. Never trust an id sent from the browser.
export function assertOwner(userId: string, resourceUserId: string | null | undefined) {
  if (userId !== resourceUserId) throw forbidden();
}

export type AdminSessionData = {
  user: SessionData['user'] & { twoFactorEnabled?: boolean | null };
  session: SessionData['session'];
};

// Where an admin request stands. Only a session the admin app created counts: the storefront has
// no 2FA, so its sessions are never accepted here, even for an admin's account (ADR-020).
export function adminAccess(
  current: AdminSessionData | null | undefined,
): 'ok' | 'signed-out' | 'forbidden' | 'needs-2fa' {
  if (!current) return 'signed-out';
  const { user, session } = current;
  if (session.app !== 'admin' || user.role !== 'admin' || user.banned) return 'forbidden';
  if (!user.twoFactorEnabled) return 'needs-2fa';
  return 'ok';
}

// First line of every admin action and route handler: an admin with 2FA, or it throws.
export function requireAdmin<S extends AdminSessionData>(current: S | null | undefined): S {
  const access = adminAccess(current);
  if (access === 'signed-out') throw unauthenticated();
  if (access !== 'ok') throw forbidden();
  return current!;
}
