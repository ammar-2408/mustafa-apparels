import type { ReactNode } from 'react';

// Sign-in and account pages: noindex, nofollow, and per request (docs/design.md §8.1).
// They read the session, so Next renders them per request.

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
