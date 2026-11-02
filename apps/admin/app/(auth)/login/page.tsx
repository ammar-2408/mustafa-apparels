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
      <h1 className="mt-4 mb-12 text-h1 font-light">Log in</h1>
      <LoginForm />
    </>
  );
}
