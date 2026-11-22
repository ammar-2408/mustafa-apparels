import { adminAccess } from '@mustafa/auth/guards';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TwoFactorSetup } from '../../../components/two-factor-setup';
import { getSession } from '../../../lib/auth';

export const metadata: Metadata = {
  title: 'Set up two-step login',
  robots: { index: false, follow: false },
};

// Only for a signed-in admin who hasn't turned 2FA on; everyone else goes elsewhere.
export default async function SetupTwoFactorPage() {
  const access = adminAccess(await getSession());
  if (access === 'ok') redirect('/');
  if (access !== 'needs-2fa') redirect('/login');
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Admin</p>
      <h1 className="mt-4 mb-6 font-serif text-h1 text-deep">Set up two-step login</h1>
      <p className="mb-8 text-body">
        Every admin login needs a code from your phone as well as your password. Confirm your
        password to begin.
      </p>
      <div className="rounded-lg border border-border bg-bg p-6 shadow-soft sm:p-8">
        <TwoFactorSetup />
      </div>
    </>
  );
}
