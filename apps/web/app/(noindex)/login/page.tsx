import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '../../../components/auth/login-form';
import { getSession } from '../../../lib/auth';
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
  if (await getSession()) redirect('/account');
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-12 text-h1 font-light">Log in</h1>
      <LoginForm />
      <p className="mt-12 text-body">
        New here?{' '}
        <Link href="/register" className="underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
