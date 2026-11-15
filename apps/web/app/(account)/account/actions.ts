'use server';
// The customer's own account actions (docs/api.md §2). Each one: the session first, then Zod,
// then a per-user limit, then core with the session's own user id, never one from the input.
// No 'server-only' import: suit cards import toggleWishlist, and they render in the filter bar
// (a client component). 'use server' keeps these on the server.

import * as account from '@mustafa/core/account';
import { type ActionResult, fail, ok, toActionError } from '@mustafa/core/action-result';
import { getDb } from '@mustafa/db/client';
import { deleteAccountInput, profileInput, wishlistInput } from '@mustafa/validators/account';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import { cookies, headers } from 'next/headers';

import { ACCOUNT_LIMITS, FRESH_SESSION_MS } from '../../../lib/account-limits';
import { currentCustomer, getAuth } from '../../../lib/auth';
import { withinLimit } from '../../../lib/services';

type Session = NonNullable<Awaited<ReturnType<typeof currentCustomer>>>;
// A Zod schema, typed by what it parses to (the app doesn't depend on zod itself).
type Schema<I> = {
  safeParse(
    raw: unknown,
  ): { success: true; data: I } | { success: false; error: Parameters<typeof fieldErrorsOf>[0] };
};

// Session, Zod, limit, then the work; errors become a safe ActionResult.
function customerAction<I, T>(
  schema: Schema<I>,
  limit: (typeof ACCOUNT_LIMITS)[keyof typeof ACCOUNT_LIMITS],
  handler: (input: I, session: Session) => Promise<ActionResult<T>>,
) {
  return async (raw: unknown): Promise<ActionResult<T>> => {
    try {
      // The full guard: a banned user, an admin account or an admin-app session is refused.
      const session = await currentCustomer();
      if (!session) return fail('UNAUTHENTICATED', 'Log in to do that.');
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return fail('VALIDATION', 'Check the highlighted fields', fieldErrorsOf(parsed.error));
      }
      if (!(await withinLimit(limit, session.user.id))) {
        return fail('RATE_LIMITED', 'Too many tries. Please wait a little and try again.');
      }
      return await handler(parsed.data, session);
    } catch (error) {
      const result = toActionError(error);
      if (result.error.code === 'INTERNAL') console.error('[account action] failed');
      return result;
    }
  };
}

/** Save a suit, or remove it with saved: false. A guest gets UNAUTHENTICATED (the heart then asks them to log in). */
export async function toggleWishlist(raw: unknown) {
  return customerAction(wishlistInput, ACCOUNT_LIMITS.wishlist, async (input, session) =>
    ok(await account.setSaved(getDb(), session.user.id, input)),
  )(raw);
}

export async function updateProfile(raw: unknown) {
  return customerAction(profileInput, ACCOUNT_LIMITS.profile, async (input, session) => {
    const row = await account.updateProfile(getDb(), session.user.id, input);
    return ok({ name: row.name, phone: row.phone });
  })(raw);
}

/**
 * Deletes the account after the password is checked, on a session from the last day (log in again
 * otherwise), then clears the session cookies.
 */
export async function deleteAccount(raw: unknown) {
  return customerAction(
    deleteAccountInput,
    ACCOUNT_LIMITS.deleteAccount,
    async (input, session) => {
      const startedAt = new Date(session.session.createdAt).getTime();
      if (Date.now() - startedAt > FRESH_SESSION_MS) {
        return fail(
          'FORBIDDEN',
          'For your safety, log out and log in again, then delete your account.',
        );
      }
      const auth = getAuth();
      if (!auth) return fail('UNAVAILABLE', 'Accounts are not available right now.');
      try {
        await auth.api.verifyPassword({
          body: { password: input.password },
          headers: await headers(),
        });
      } catch {
        return fail('VALIDATION', 'Check the highlighted fields', {
          password: ['That password is not right'],
        });
      }
      await account.deleteAccount(getDb(), session.user.id);
      const jar = await cookies();
      for (const { name } of jar.getAll()) {
        if (/^(__Secure-)?ma\./.test(name)) jar.delete(name);
      }
      return ok({ deleted: true });
    },
  )(raw);
}
