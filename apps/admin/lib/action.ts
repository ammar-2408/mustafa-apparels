// Every admin server action is built with this, so the order in docs/api.md §1 can't be skipped:
// requireAdmin() first, then the Zod schema, then the admin-write rate limit, then the work. Errors become a safe ActionResult.
// test/admin-actions-authz.test.ts calls every action with a customer session and with none.
import 'server-only';

import { type ActionResult, fail, ok, toActionError } from '@mustafa/core/action-result';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import type { z } from 'zod';

import { requireAdmin } from './auth';
import { ADMIN_LIMITS, enforceLimit } from './limits';

type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;

export function adminAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.infer<S>, context: { session: AdminSession }) => Promise<T>,
) {
  return async (raw: unknown): Promise<ActionResult<T>> => {
    try {
      const session = await requireAdmin();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return fail('VALIDATION', 'Check the highlighted fields', fieldErrorsOf(parsed.error));
      }
      await enforceLimit(ADMIN_LIMITS.adminWrite, session.user.id);
      return ok(await handler(parsed.data, { session }));
    } catch (error) {
      const result = toActionError(error);
      // Our own errors are expected; anything else is a bug worth a log line (never the input).
      if (result.error.code === 'INTERNAL') {
        console.error(`[admin action] ${error instanceof Error ? error.name : 'error'}`);
      }
      return result;
    }
  };
}
