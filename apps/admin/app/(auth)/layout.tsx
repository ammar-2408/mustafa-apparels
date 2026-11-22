import { Logo } from '@mustafa/ui/logo';
import type { ReactNode } from 'react';

import { dmSerif } from '../fonts-serif';

// Login and 2FA pages in the storefront's look (owner, 2026-11-22): a powder blue band with the
// full logo, then one narrow card on a soft background. No motion in the admin.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${dmSerif.variable} flex min-h-dvh flex-col`}>
      <header className="bg-primary px-gutter py-4">
        <Logo variant="secondary" height={48} loading="eager" />
      </header>
      <div className="flex-1 bg-linear-to-b from-bg to-surface-soft">
        <main className="mx-auto w-full max-w-md px-gutter pt-12 pb-section">{children}</main>
      </div>
    </div>
  );
}
