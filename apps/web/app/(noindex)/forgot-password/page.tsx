import Link from 'next/link';
import { connection } from 'next/server';

import { ForgotPasswordForm } from '../../../components/auth/forgot-password-form';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Forgot your password',
  description:
    'Forgot the password for your Mustafa Apparels account? Enter your email and we will send you a secure link to set a new one.',
  path: '/forgot-password',
  noindex: true,
  nofollow: true,
});

// Per request, so proxy.ts's CSP nonce reaches Next's scripts (Tier B).
export default async function ForgotPasswordPage() {
  await connection();
  return (
    <div className="mx-auto w-full max-w-md px-gutter pt-12 pb-section">
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-6 text-h1 font-light">Forgot your password</h1>
      <p className="mb-12 text-body">
        Enter the email you signed up with, and we’ll send you a link to set a new password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-12 text-body">
        Remembered it?{' '}
        <Link href="/login" className="link">
          Log in
        </Link>
      </p>
    </div>
  );
}
