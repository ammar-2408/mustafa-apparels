'use client';

import { type ComponentProps, useId } from 'react';

type InputProps = ComponentProps<'input'> & {
  /** Always shown: a placeholder is never the only label (docs/design.md §7). */
  label: string;
  hint?: string;
  error?: string;
};

// 16px text stops iOS zooming in on focus. The focus ring comes from the theme.
export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className="mb-2 caps-tight text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="min-h-12 w-full rounded-sm border border-border-strong bg-surface px-4 text-body text-fg placeholder:text-muted aria-invalid:border-error"
        {...props}
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-small text-muted">
          {hint}
        </p>
      ) : null}
      {/* On the page from the start, so screen readers announce an error when it appears. */}
      <p id={errorId} aria-live="polite" className="mt-2 text-small text-error empty:mt-0">
        {error}
      </p>
    </div>
  );
}
