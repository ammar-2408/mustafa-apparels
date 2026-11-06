'use client';

import { Button, buttonClass } from '@mustafa/ui/button';
import Link from 'next/link';

// A page that failed to render (500). Never shows the error itself: no stack, no message from
// the server (docs/design.md §8.6). The digest lets the server log be found.
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto max-w-content-wide px-gutter py-section focus:outline-none"
    >
      <h1 className="max-w-3xl text-h1 font-light">Something went wrong</h1>
      <p className="mt-8 max-w-2xl text-body-lg">
        This page didn&rsquo;t load. Please try again in a moment, or ask us about a suit on
        WhatsApp.
      </p>
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClass('secondary')}>
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
