'use client';

import { createContext, type ReactNode, useContext, useId } from 'react';

export type FieldProps = {
  /** Always shown: a placeholder is never the only label (docs/design.md §7). */
  label: string;
  hint?: string;
  error?: string;
  /** "card": the sign-up and login cards' Bold deep green label and rounder field (2026-11-22). */
  look?: FieldLookName;
};

export type FieldLookName = 'plain' | 'card';

const LookContext = createContext<FieldLookName>('plain');

/** Sets the look of every field inside it (the admin uses the storefront's card look). */
export function FieldLook({ look, children }: { look: FieldLookName; children: ReactNode }) {
  return <LookContext.Provider value={look}>{children}</LookContext.Provider>;
}

/** The field's own look if set, else the one around it. */
export function useLook(look?: FieldLookName): FieldLookName {
  const around = useContext(LookContext);
  return look ?? around;
}

/** The control's classes for a look: the card look has rounder corners. */
export function controlClass(look: FieldLookName) {
  return look === 'card' ? CONTROL_CLASS.replace('rounded-sm', 'rounded-md') : CONTROL_CLASS;
}

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
  look = 'plain',
  children,
}: FieldShellProps) {
  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      <label
        htmlFor={controlId}
        className={
          look === 'card' ? 'mb-2 text-body font-bold text-deep' : 'mb-2 caps-tight text-fg'
        }
      >
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
