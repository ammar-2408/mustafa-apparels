import { LogoutButton } from '../../../components/auth/logout-button';
import { requireUserPage } from '../../../lib/auth';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Your account',
  description:
    'Your Mustafa Apparels account: your details now, with your saved suits and your questions about unstitched suits to follow.',
  path: '/account',
  noindex: true,
  nofollow: true,
});

// The full account page (wishlist, inquiries, profile, delete) comes at step 6.10.
export default async function AccountPage() {
  const { user } = await requireUserPage();
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-12 text-h1 font-light">Your account</h1>
      <dl className="mb-12 flex flex-col gap-6 text-body">
        <div>
          <dt className="caps-tight text-muted">Name</dt>
          <dd className="mt-2">{user.name}</dd>
        </div>
        <div>
          <dt className="caps-tight text-muted">Email</dt>
          <dd className="mt-2">{user.email}</dd>
        </div>
      </dl>
      <LogoutButton />
    </>
  );
}
