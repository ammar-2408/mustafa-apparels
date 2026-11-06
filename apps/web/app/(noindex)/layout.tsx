import type { ReactNode } from 'react';

// Sign-in and account pages: noindex, nofollow, and per request (docs/design.md §8.1).
// Blocking per-request render (no streamed shell), so redirects and status codes stay real.
export const instant = false;

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-md px-gutter pt-12 pb-section focus:outline-none"
    >
      {children}
    </main>
  );
}
