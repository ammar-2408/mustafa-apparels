'use client';

import { type ComponentProps, useState } from 'react';

import { CONTROL_CLASS, type FieldProps, FieldShell, useField } from './field';

type TextareaProps = ComponentProps<'textarea'> &
  FieldProps & {
    /** Shows "12 / 200" under the field while typing, when maxLength is set. */
    showCount?: boolean;
  };

export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  showCount = false,
  rows = 4,
  onChange,
  ...props
}: TextareaProps) {
  const { controlId, hintId, errorId, aria } = useField(id, hint, error);
  const initial = String(props.value ?? props.defaultValue ?? '').length;
  const [length, setLength] = useState(initial);
  const count = showCount && props.maxLength ? `${length} / ${props.maxLength}` : null;

  return (
    <FieldShell {...{ label, hint, error, controlId, hintId, errorId, className }}>
      <textarea
        id={controlId}
        rows={rows}
        {...aria}
        className={`py-3 ${CONTROL_CLASS}`}
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange?.(event);
        }}
        {...props}
      />
      {count ? (
        <p className="mt-1 self-end text-small text-muted" aria-hidden="true">
          {count}
        </p>
      ) : null}
    </FieldShell>
  );
}
