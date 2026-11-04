import { Logo } from '@mustafa/ui/logo';
import type { ReactNode } from 'react';

import { AdminNav } from '../../components/admin-nav';
import { LogoutButton } from '../../components/logout-button';
import { requireAdminPage } from '../../lib/auth';

// Every signed-in admin page: the powder blue sidebar (a top bar on phones) and a white
// working area. Dense tables from md, cards below it (docs/design.md, admin). No motion.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdminPage();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <header className="bg-primary text-primary-fg md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:py-8">
        <div className="hidden px-6 pb-10 md:block">
          <Logo variant="simplified" height={34} loading="eager" />
        </div>
        <AdminNav
          mobileLogo={<Logo variant="submark" loading="eager" />}
          footer={
            <>
              <p className="mb-3 truncate px-3 text-small" title={user.email}>
                {user.email}
              </p>
              <LogoutButton className="w-full whitespace-nowrap" />
            </>
          }
        />
      </header>
      <main id="main" className="px-gutter py-10 md:py-12">
        {children}
      </main>
    </div>
  );
}
