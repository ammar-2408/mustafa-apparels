import type { ReactNode } from 'react';

import { HeaderLogo } from '../../components/logo';

// Sign-in and account pages: noindex, nofollow, and dynamic (docs/design.md §8.1).
// A plain header until the real one arrives at step 6.1.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="px-gutter py-4">
        <HeaderLogo />
      </header>
      <main className="mx-auto w-full max-w-md px-gutter pt-12 pb-section">{children}</main>
    </>
  );
}
