import Link from 'next/link';
import { connection } from 'next/server';

import { RegisterForm } from '../../../components/auth/register-form';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Create an account',
  description:
    'Create a Mustafa Apparels account to save the unstitched suits you like and keep track of every question you send us about them.',
  path: '/register',
  noindex: true,
  nofollow: true,
});

// Per request, so proxy.ts's CSP nonce reaches Next's scripts (Tier B).
export default async function RegisterPage() {
  await connection();
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-12 text-h1 font-light">Create an account</h1>
      <RegisterForm />
      <p className="mt-12 text-body">
        Already have one?{' '}
        <Link href="/login" className="link">
          Log in
        </Link>
      </p>
    </>
  );
}
