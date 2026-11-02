import Link from 'next/link';

import { RegisterForm } from '../../../components/auth/register-form';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Create an account',
  description:
    'Create a Mustafa Apparels account to save the unstitched suits you like and keep track of the questions you send us.',
  path: '/register',
  noindex: true,
  nofollow: true,
});

export default function RegisterPage() {
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-12 text-h1 font-light">Create an account</h1>
      <RegisterForm />
      <p className="mt-12 text-body">
        Already have one?{' '}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
