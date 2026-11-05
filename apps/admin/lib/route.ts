// Every admin route handler is built with this: requireAdmin() first, then the handler. Errors
// become the JSON shape and status from docs/api.md §1; nothing internal reaches the browser.
import 'server-only';

import { type ErrorCode, toActionError } from '@mustafa/core/action-result';
import { invalid } from '@mustafa/core/errors';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import type { z } from 'zod';

import { requireAdmin } from './auth';

type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
};

const NO_STORE = { 'Cache-Control': 'no-store' };

export function adminRoute(
  handler: (request: Request, context: { session: AdminSession }) => Promise<unknown>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const session = await requireAdmin();
      const result = await handler(request, { session });
      // A handler may answer with its own Response (another status or shape).
      return result instanceof Response ? result : Response.json(result, { headers: NO_STORE });
    } catch (error) {
      const { error: body } = toActionError(error);
      if (body.code === 'INTERNAL') {
        console.error(`[admin route] ${error instanceof Error ? error.name : 'error'}`);
      }
      return Response.json({ error: body }, { status: STATUS[body.code], headers: NO_STORE });
    }
  };
}

// The JSON body, checked against a strict schema; VALIDATION when it isn't JSON or doesn't fit.
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw invalid({ body: ['Send a JSON body'] });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw invalid(fieldErrorsOf(parsed.error));
  return parsed.data;
}
