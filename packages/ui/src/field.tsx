'use client';

import { type ReactNode, useId } from 'react';

export type FieldProps = {
  /** Always shown: a placeholder is never the only label (docs/design.md §7). */
  label: string;
  hint?: string;
  error?: string;
};

// Ids and ARIA for one labelled control, shared by Input, Textarea and Select.
export function useField(id: string | undefined, hint?: string, error?: string) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');
  return {
    controlId,
    hintId,
    errorId,
    aria: {
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
    },
  };
}

type FieldShellProps = FieldProps & {
  controlId: string;
  hintId: string;
  errorId: string;
  className?: string | undefined;
  children: ReactNode;
};

// Label above, control, hint, then the error in a live region that is on the page from the
// start, so screen readers announce an error when it appears.
export function FieldShell({
  label,
  hint,
  error,
  controlId,
  hintId,
  errorId,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      <label htmlFor={controlId} className="mb-2 caps-tight text-fg">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="mt-2 text-small text-muted">
          {hint}
        </p>
      ) : null}
      <p id={errorId} aria-live="polite" className="mt-2 text-small text-error empty:mt-0">
        {error}
      </p>
    </div>
  );
}

// The look every text control shares. 16px text stops iOS zooming in on focus; the focus ring
// comes from the theme.
export const CONTROL_CLASS =
  'w-full rounded-sm border border-border-strong bg-surface px-4 text-body text-fg placeholder:text-muted aria-invalid:border-error';
