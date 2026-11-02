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
      <h1 className="mt-4 mb-6 text-h1 font-light">Enter your code</h1>
      <p className="mb-12 text-body">
        Open your authenticator app and enter the 6-digit code for Mustafa Apparels Admin.
      </p>
      <VerifyCodeForm />
    </>
  );
}
