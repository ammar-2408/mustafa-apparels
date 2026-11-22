import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthShell } from '../../../components/auth/auth-shell';
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

// The owner's NEWLOGIN.png (2026-11-22), in the same layout as sign-up.
export default async function LoginPage() {
  // Only a session /account accepts, or a banned user would bounce between the two pages.
  if (await currentCustomer()) redirect('/account');
  return (
    <AuthShell
      title="Log"
      accent="in"
      lead="Welcome back to MA Apparels by Mustafa Ahmed."
      footer={
        <>
          <Link href="/forgot-password" className="link font-bold text-deep">
            Forgot your password?
          </Link>
          <p className="my-6 flex items-center gap-4 caps-tight text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border-strong" />
            Or
            <span className="h-px flex-1 bg-border-strong" />
          </p>
          <p>
            New here?{' '}
            <Link href="/register" className="link font-bold text-accent-text">
              Create an account
            </Link>
          </p>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
