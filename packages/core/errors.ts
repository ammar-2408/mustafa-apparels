// Errors thrown on purpose, by core and by the auth guards. Server actions map `code` to
// ActionResult (./action-result.ts, docs/api.md §1); messages are safe to show.
// Anything else is a bug and becomes INTERNAL.

export type CoreErrorCode =
  'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RATE_LIMITED';
export type FieldErrors = Record<string, string[]>;

export class CoreError extends Error {
  readonly code: CoreErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: CoreErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    if (fieldErrors) this.fieldErrors = fieldErrors;
  }
}

export const notFound = (what: string) => new CoreError('NOT_FOUND', `${what} not found`);

export const unauthenticated = () => new CoreError('UNAUTHENTICATED', 'Please log in to continue.');

export const forbidden = () => new CoreError('FORBIDDEN', "You don't have access to this.");

export const rateLimited = () =>
  new CoreError('RATE_LIMITED', 'Too many attempts. Please try again in a few minutes.');

export const invalid = (fieldErrors: FieldErrors) =>
  new CoreError('VALIDATION', 'Check the highlighted fields', fieldErrors);

// A field of the Postgres error, or of the cause Drizzle wraps it in.
const pgField = (error: unknown, field: 'code' | 'constraint'): string | undefined => {
  for (let e = error; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const value = (e as Record<string, unknown>)[field];
    if (typeof value === 'string') return value;
  }
  return undefined;
};

export const isUniqueViolation = (error: unknown) => pgField(error, 'code') === '23505';
export const isForeignKeyViolation = (error: unknown) => pgField(error, 'code') === '23503';
export const violatedConstraint = (error: unknown) => pgField(error, 'constraint');
