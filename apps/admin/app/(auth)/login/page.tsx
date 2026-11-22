import type { Metadata } from 'next';

import { LoginForm } from '../../../components/login-form';

export const metadata: Metadata = {
  title: 'Log in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Admin</p>
      <h1 className="mt-4 mb-8 font-serif text-h1 text-deep">Log in</h1>
      <div className="rounded-lg border border-border bg-bg p-6 shadow-soft sm:p-8">
        <LoginForm />
      </div>
    </>
  );
}
