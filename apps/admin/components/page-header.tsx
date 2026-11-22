import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  /** A small line above the title, e.g. the suit's design code. */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** A button beside the title, e.g. "New suit". */
  action?: ReactNode;
  className?: string;
};

// Every admin page's title, in the storefront's look (owner, 2026-11-22): the deep green serif
// with the orange lotus between two lines under it, an optional eyebrow, subtitle and action.
export function PageHeader({ title, eyebrow, subtitle, action, className }: Props) {
  return (
    <div className={`mb-10 flex flex-wrap items-end justify-between gap-6 ${className ?? ''}`}>
      <div className="flex min-w-0 flex-col">
        {eyebrow && <p className="caps-tight text-muted sm:caps">{eyebrow}</p>}
        <h1 className="mt-1 font-serif text-h2 break-words text-deep">{title}</h1>
        <span aria-hidden="true" className="mt-3 flex items-center gap-3">
          <span className="h-0.5 w-14 bg-accent" />
          <svg viewBox="0 0 24 24" fill="none" className="size-5 text-accent-text">
            <path
              d="M12 4c2.6 3 3.4 7.5 0 13-3.4-5.5-2.6-10 0-13zM12 17c-2-4.5-5.5-7-9-7 .5 4.5 4 7 9 7zM12 17c2-4.5 5.5-7 9-7-.5 4.5-4 7-9 7z"
              fill="currentColor"
            />
          </svg>
          <span className="h-0.5 w-14 bg-accent" />
        </span>
        {subtitle && <div className="mt-4 max-w-2xl text-body text-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
