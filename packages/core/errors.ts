// Errors core throws on purpose. Server actions map `code` to ActionResult (docs/api.md §1);
// messages are safe to show the admin. Anything else is a bug and becomes INTERNAL.

export type CoreErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION';
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
