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

// Postgres error codes, from the error or the cause Drizzle wraps it in.
const pgCode = (error: unknown): string | undefined => {
  for (let e = error; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
};

export const isUniqueViolation = (error: unknown) => pgCode(error) === '23505';
export const isForeignKeyViolation = (error: unknown) => pgCode(error) === '23503';
