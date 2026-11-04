'use client';

import { type ComponentProps, useId } from 'react';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label: string;
  hint?: string;
};

// Box and label side by side; the whole row is at least 44px tall, so it is easy to tap.
export function Checkbox({ label, hint, id, className, ...props }: CheckboxProps) {
  const autoId = useId();
  const boxId = id ?? autoId;
  const hintId = `${boxId}-hint`;
  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      <label htmlFor={boxId} className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
        <input
          id={boxId}
          type="checkbox"
          aria-describedby={hint ? hintId : undefined}
          className="size-5 shrink-0 accent-action"
          {...props}
        />
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
