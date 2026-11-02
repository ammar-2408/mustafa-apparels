import type { Metadata } from 'next';

import { LogoutButton } from '../components/logout-button';
import { requireAdminPage } from '../lib/auth';

export const metadata: Metadata = { title: 'Dashboard' };

// Placeholder until the dashboard and sidebar arrive at step 4.1. The check runs here as well as
// in proxy.ts, because the proxy only sees that a cookie exists.
export default async function Dashboard() {
  const { user } = await requireAdminPage();
  return (
    <main className="px-gutter py-12">
      <p className="caps-tight text-muted sm:caps">Admin</p>
      <h1 className="mt-4 mb-6 text-h1 font-light">Dashboard</h1>
      <p className="mb-12 text-body">Signed in as {user.email}.</p>
      <LogoutButton />
    </main>
  );
}
