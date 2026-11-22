import type { ReactNode } from 'react';

// Sign-in and account pages: noindex, nofollow, and per request (docs/design.md §8.1).
// They read the session, so Next renders them per request. Each page sets its own width: sign-up
// and login run edge to edge (AuthShell), the password pages use AuthColumn.

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="w-full focus:outline-none">
      {children}
    </main>
  );
}
