import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '../../../components/auth/login-form';
import { currentCustomer } from '../../../lib/auth';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Log in',
  description:
    'Log in to your Mustafa Apparels account to see your saved suits and the questions you have sent us about unstitched suits.',
  path: '/login',
  noindex: true,
  nofollow: true,
});

export default async function LoginPage() {
  // Only a session /account accepts, or a banned user would bounce between the two pages.
  if (await currentCustomer()) redirect('/account');
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-12 text-h1 font-light">Log in</h1>
      <LoginForm />
      <p className="mt-6 text-body">
        <Link href="/forgot-password" className="link">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-12 text-body">
        New here?{' '}
        <Link href="/register" className="link">
          Create an account
        </Link>
      </p>
    </>
  );
}
