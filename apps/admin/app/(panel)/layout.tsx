import { FieldLook } from '@mustafa/ui/field';
import { Logo } from '@mustafa/ui/logo';
import type { ReactNode } from 'react';

import { AdminNav } from '../../components/admin-nav';
import { LogoutButton } from '../../components/logout-button';
import { requireAdminPage } from '../../lib/auth';
import { dmSerif } from '../fonts-serif';

// Every signed-in admin page, in the storefront's look (owner, 2026-11-22): the powder blue
// sidebar with the full logo and a soft white wave (a top bar on phones), and a white working area
// that fades to pale powder blue. Titles are the deep green serif; every field has the card look.
// Dense tables from md, cards below it (docs/design.md, admin). No motion.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdminPage();
  return (
    <div className={`${dmSerif.variable} min-h-dvh md:grid md:grid-cols-[16rem_minmax(0,1fr)]`}>
      <header className="relative bg-primary text-primary-fg md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:py-8">
        <div className="hidden px-6 pb-10 md:block">
          <Logo variant="secondary" height={48} loading="eager" />
        </div>
        <AdminNav
          mobileLogo={<Logo variant="secondary" height={40} loading="eager" />}
          footer={
            <>
              <p className="mb-3 truncate px-3 text-small" title={user.email}>
                {user.email}
              </p>
              <LogoutButton className="w-full whitespace-nowrap" />
            </>
          }
        />
        {/* The storefront navbar's soft white wave, along the bottom (phones) or the right edge. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 h-4 w-full fill-bg/25 md:hidden"
        >
          <path d="M0 40V26c180-24 380-26 560-8s360 20 540 2 260-18 340-12v32z" />
        </svg>
      </header>
      <main
        id="main"
        className="bg-linear-to-b from-bg via-bg to-surface-soft px-gutter py-10 md:py-12"
      >
        <FieldLook look="card">{children}</FieldLook>
      </main>
    </div>
  );
}
