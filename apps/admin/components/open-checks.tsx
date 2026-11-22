'use client';

import { FormError } from '@mustafa/ui/form-error';
import { useState } from 'react';

import { clearProductCheck } from '../app/(panel)/suits/actions';

// The owner's open check: items for this suit (docs/catalog.md). Each must be cleared before
// the suit can be published; clearing is kept in the audit log with the item's text.
export function OpenChecks({ id, checks }: { id: string; checks: string[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (checks.length === 0) return null;

  async function clear(check: string) {
    setPending(check);
    setError('');
    const result = await clearProductCheck({ id, check });
    setPending(null);
    if (!result.ok) setError(result.error.message);
  }

  return (
    <section
      aria-labelledby="checks-heading"
      className="mb-12 flex flex-col gap-3 rounded-lg border border-accent bg-bg p-5 shadow-soft"
    >
      <h2 id="checks-heading" className="caps-tight">
        Open checks ({checks.length})
      </h2>
      <p className="text-small text-muted">
        Confirm each one, then mark it cleared. The suit can be published once none are left.
      </p>
      <FormError message={error} />
      <ul className="flex flex-col gap-2">
        {checks.map((check) => (
          <li
            key={check}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2"
          >
            <span className="text-body">{check}</span>
            <button
              type="button"
              className="caps-tight min-h-11 px-2 underline-offset-4 hover:underline"
              disabled={pending !== null}
              onClick={() => clear(check)}
              aria-label={`Mark cleared: ${check}`}
            >
              {pending === check ? 'Clearing…' : 'Cleared'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
