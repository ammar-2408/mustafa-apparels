'use client';

import { type ComponentProps, type ReactNode, useState } from 'react';

import { CONTROL_CLASS, type FieldProps, FieldShell, useField } from './field';

type InputProps = ComponentProps<'input'> &
  FieldProps & {
    /** An icon at the start of the field (the sign-up and login cards). */
    icon?: ReactNode;
    /** A password field with a Show/Hide toggle. */
    revealable?: boolean;
  };

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      {!open && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}

export function Input({
  label,
  hint,
  error,
  id,
  className,
  look,
  icon,
  revealable = false,
  type,
  ...props
}: InputProps) {
  const { controlId, hintId, errorId, aria } = useField(id, hint, error);
  const [shown, setShown] = useState(false);
  const control = [
    'min-h-12',
    // The card look swaps the plain field's small corners for rounder ones.
    look === 'card' ? CONTROL_CLASS.replace('rounded-sm', 'rounded-md') : CONTROL_CLASS,
    icon ? 'pl-12' : '',
    revealable ? 'pr-12' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const input = (
    <input
      id={controlId}
      {...aria}
      type={revealable && shown ? 'text' : type}
      className={control}
      {...props}
    />
  );
  return (
    <FieldShell {...{ label, hint, error, controlId, hintId, errorId, className, look }}>
      {icon || revealable ? (
        <div className="relative">
          {icon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-fg [&_svg]:size-6"
            >
              {icon}
            </span>
          )}
          {input}
          {revealable && (
            <button
              type="button"
              aria-label={shown ? 'Hide password' : 'Show password'}
              aria-pressed={shown}
              aria-controls={controlId}
              onClick={() => setShown((value) => !value)}
              className="absolute inset-y-0 right-1 flex min-w-11 items-center justify-center rounded-md text-fg"
            >
              <EyeIcon open={shown} />
            </button>
          )}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}
