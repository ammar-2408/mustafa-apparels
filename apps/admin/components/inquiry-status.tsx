'use client';

import { useState } from 'react';

import { setInquiryStatus } from '../app/(panel)/inquiries/actions';

type Status = 'new' | 'contacted' | 'closed';

const NEXT: Record<Status, { status: Status; label: string }[]> = {
  new: [
    { status: 'contacted', label: 'Mark contacted' },
    { status: 'closed', label: 'Close' },
  ],
  contacted: [
    { status: 'closed', label: 'Close' },
    { status: 'new', label: 'Back to new' },
  ],
  closed: [{ status: 'new', label: 'Reopen' }],
};

// Moves one inquiry to another tab; the inbox refreshes with the action's answer.
export function InquiryStatus({ id, status, name }: { id: string; status: Status; name: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function move(next: Status) {
    setPending(true);
    setError('');
    const result = await setInquiryStatus({ id, status: next });
    setPending(false);
    if (!result.ok) setError(result.error.message);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4">
      {NEXT[status].map((option) => (
        <button
          key={option.status}
          type="button"
          className="caps-tight min-h-11 underline-offset-4 hover:underline disabled:opacity-40"
          disabled={pending}
          aria-label={`${option.label}: ${name}`}
          onClick={() => move(option.status)}
        >
          {option.label}
        </button>
      ))}
      <p role="alert" className="text-small text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}
