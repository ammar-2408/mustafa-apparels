import type { ReactNode } from 'react';

// The search page: live per request (it reads the query), noindex, follow (docs/design.md §8.1).
export default function SearchLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content-wide px-gutter pt-12 pb-section focus:outline-none"
    >
      {children}
    </main>
  );
}
