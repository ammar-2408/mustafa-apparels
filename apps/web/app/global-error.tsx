'use client';

import './globals.css';

import { montserrat } from './fonts';

// When the root layout itself fails: its own <html>, no header or data, and never the error.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        <main className="mx-auto max-w-content px-gutter py-section">
          <h1 className="text-h1 font-light">Something went wrong</h1>
          <p className="mt-8 text-body-lg">
            Mustafa Apparels didn&rsquo;t load. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-12 min-h-12 rounded-sm bg-action px-8 caps-tight text-action-fg"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
