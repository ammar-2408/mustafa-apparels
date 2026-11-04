'use client';

import type { ComponentProps } from 'react';

import { CONTROL_CLASS, type FieldProps, FieldShell, useField } from './field';

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<ComponentProps<'select'>, 'children'> &
  FieldProps & {
    options: readonly SelectOption[];
    /** A first, empty choice ("Choose…", "Any"), for optional fields and filters. */
    placeholder?: string;
  };

// A native select: the phone's own picker, and keyboard use for free.
export function Select({
  label,
  hint,
  error,
  id,
  className,
  options,
  placeholder,
  ...props
}: SelectProps) {
  const { controlId, hintId, errorId, aria } = useField(id, hint, error);
  return (
    <FieldShell {...{ label, hint, error, controlId, hintId, errorId, className }}>
      <select id={controlId} {...aria} className={`min-h-12 ${CONTROL_CLASS}`} {...props}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
