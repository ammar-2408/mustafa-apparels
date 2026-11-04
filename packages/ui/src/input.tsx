'use client';

import type { ComponentProps } from 'react';

import { CONTROL_CLASS, type FieldProps, FieldShell, useField } from './field';

type InputProps = ComponentProps<'input'> & FieldProps;

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const { controlId, hintId, errorId, aria } = useField(id, hint, error);
  return (
    <FieldShell {...{ label, hint, error, controlId, hintId, errorId, className }}>
      <input id={controlId} {...aria} className={`min-h-12 ${CONTROL_CLASS}`} {...props} />
    </FieldShell>
  );
}
