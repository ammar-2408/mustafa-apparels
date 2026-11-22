import Link from 'next/link';
import { connection } from 'next/server';

import { AuthShell } from '../../../components/auth/auth-shell';
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

// Per request, so proxy.ts's CSP nonce reaches Next's scripts (Tier B). The owner's
// NEWSIGNUP.png (2026-11-22).
export default async function RegisterPage() {
  await connection();
  return (
    <AuthShell
      title="Create an"
      accent="Account"
      lead="Join MA Apparels by Mustafa Ahmed and start your shopping journey."
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/login" className="link font-bold text-accent-text">
            Log in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
