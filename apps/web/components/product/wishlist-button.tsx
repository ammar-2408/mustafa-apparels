'use client';

import { buttonClass } from '@mustafa/ui/button';
import { Dialog } from '@mustafa/ui/dialog';
import Link from 'next/link';
import { useState } from 'react';

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

type Props = {
  name: string;
  /** Saves or removes the suit; resolves to the new state, or null when the shopper isn't signed in. */
  onToggle?: () => Promise<boolean | null>;
  initiallySaved?: boolean;
};

// The heart on a card or a suit page. Cached pages carry no session, so it learns the state only
// when tapped: a guest is asked to log in (step 6.10 connects the save itself).
export function WishlistButton({ name, onToggle, initiallySaved = false }: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const [askLogin, setAskLogin] = useState(false);
  // Mounted on the first tap only: a grid would otherwise carry one hidden dialog per card.
  const [asked, setAsked] = useState(false);
  const ask = () => {
    setAsked(true);
    setAskLogin(true);
  };
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!onToggle) {
      ask();
      return;
    }
    setPending(true);
    const next = await onToggle();
    setPending(false);
    if (next === null) ask();
    else setSaved(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        aria-label={`Save ${name}`}
        className="inline-flex size-11 items-center justify-center rounded-full bg-bg text-fg shadow-soft"
      >
        <HeartIcon filled={saved} />
      </button>
      {asked && (
        <Dialog open={askLogin} onClose={() => setAskLogin(false)} title="Save suits you like">
          <p className="text-body">Log in or create an account to keep a list of suits you like.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={buttonClass('primary')}>
              Log in
            </Link>
            <Link href="/register" className={buttonClass('secondary')}>
              Create account
            </Link>
          </div>
        </Dialog>
      )}
    </>
  );
}
