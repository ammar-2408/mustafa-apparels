import type { ReactNode } from 'react';

// The signed-in account page: per request (it reads the session), noindex, nofollow, and wide
// enough for the saved suits grid (docs/design.md §8.1).
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content px-gutter pt-12 pb-section focus:outline-none"
    >
      {children}
    </main>
  );
}
