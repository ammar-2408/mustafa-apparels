'use client';

import { type ComponentProps, useState } from 'react';

import { controlClass, type FieldProps, FieldShell, useField, useLook } from './field';

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
  look,
  showCount = false,
  rows = 4,
  onChange,
  ...props
}: TextareaProps) {
  const { controlId, hintId, errorId, aria } = useField(id, hint, error);
  const resolved = useLook(look);
  const initial = String(props.value ?? props.defaultValue ?? '').length;
  const [length, setLength] = useState(initial);
  const count = showCount && props.maxLength ? `${length} / ${props.maxLength}` : null;

  return (
    <FieldShell {...{ label, hint, error, controlId, hintId, errorId, className }} look={resolved}>
      <textarea
        id={controlId}
        rows={rows}
        {...aria}
        className={`py-3 ${controlClass(resolved)}`}
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
