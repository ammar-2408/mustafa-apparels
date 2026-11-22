'use client';

import type { ActionResult } from '@mustafa/core/action-result';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';
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
  productId: string;
  name: string;
  /** The toggleWishlist server action. Without it, the heart only asks the shopper to log in. */
  toggle?: (raw: unknown) => Promise<ActionResult<{ saved: boolean }>>;
};

// The heart on a card. Cached pages carry no session, so it doesn't know what's saved: the first
// tap saves (saving twice is harmless), a second tap removes, and a guest is asked to log in.
// The full list, with Remove, is on the account page.
export function WishlistButton({ productId, name, toggle }: Props) {
  const [saved, setSaved] = useState(false);
  const [askLogin, setAskLogin] = useState(false);
  // Mounted on the first tap only: a grid would otherwise carry one hidden dialog per card.
  const [asked, setAsked] = useState(false);
  const ask = () => {
    setAsked(true);
    setAskLogin(true);
  };
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState('');

  async function onTap() {
    if (!toggle) {
      ask();
      return;
    }
    setPending(true);
    setProblem('');
    const result = await toggle({ productId, saved: !saved });
    setPending(false);
    if (result.ok) setSaved(result.data.saved);
    else if (result.error.code === 'UNAUTHENTICATED' || result.error.code === 'UNAVAILABLE') ask();
    // Too many taps, a suit no longer on sale, or a fault: say so, rather than seem to save.
    else
      setProblem(
        result.error.code === 'NOT_FOUND'
          ? 'This suit is no longer available.'
          : "Couldn't save that. Please try again.",
      );
  }

  return (
    <>
      <button
        type="button"
        onClick={onTap}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? `Saved: ${name}. Tap to remove` : `Save ${name}`}
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
              <ButtonCircle />
            </Link>
            <Link href="/register" className={buttonClass('secondary')}>
              Create account
              <ButtonCircle />
            </Link>
          </div>
        </Dialog>
      )}
      <span role="status" className="sr-only">
        {problem}
      </span>
      {problem && (
        <span className="absolute top-full right-0 mt-1 w-40 rounded-sm bg-bg px-2 py-1 text-small text-error shadow-soft">
          {problem}
        </span>
      )}
    </>
  );
}
