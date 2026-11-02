'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

type DialogProps = {
  open: boolean;
  /** Called for the close button, Esc and a click on the backdrop. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

// A native modal <dialog>: the browser traps focus, closes on Esc and returns focus afterwards.
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A click that lands on the <dialog> itself, outside the content box, is on the backdrop.
  // Esc is the keyboard equivalent.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('click', onClick);
    return () => dialog.removeEventListener('click', onClick);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={[
        // Keeps the page gutter on each side on phones.
        'm-auto w-[calc(100%_-_2*var(--spacing-gutter))] max-w-lg rounded-sm bg-surface p-0 text-fg shadow-soft backdrop:bg-fg/40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-h3 font-light">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
