import type { Metadata } from 'next';

import { VerifyCodeForm } from '../../../../components/verify-code-form';

export const metadata: Metadata = {
  title: 'Enter your code',
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Admin</p>
      <h1 className="mt-4 mb-6 font-serif text-h1 text-deep">Enter your code</h1>
      <p className="mb-8 text-body">
        Open your authenticator app and enter the 6-digit code for Mustafa Apparels Admin.
      </p>
      <div className="rounded-lg border border-border bg-bg p-6 shadow-soft sm:p-8">
        <VerifyCodeForm />
      </div>
    </>
  );
}
