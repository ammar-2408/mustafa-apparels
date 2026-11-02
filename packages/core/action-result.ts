// The shape every server action returns (docs/api.md §1).
import { CoreError, type CoreErrorCode, type FieldErrors } from './errors';

export type ErrorCode = CoreErrorCode | 'INTERNAL';

export type ActionFailure = {
  ok: false;
  error: { code: ErrorCode; message: string; fieldErrors?: FieldErrors };
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

export const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export const fail = (
  code: ErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
): ActionFailure => ({
  ok: false,
  error: { code, message, ...(fieldErrors && { fieldErrors }) },
});

// Our own errors keep their safe message. Anything else may hold SQL, paths or secrets,
// so the caller only ever sees a generic one; log the original on the server.
export function toActionError(error: unknown): ActionFailure {
  if (error instanceof CoreError) return fail(error.code, error.message, error.fieldErrors);
  return fail('INTERNAL', 'Something went wrong. Please try again.');
}
