import { AUTH_MESSAGES, resetPasswordParams } from '@mustafa/validators/auth';
import Link from 'next/link';

import { ResetPasswordForm } from '../../../components/auth/reset-password-form';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Set a new password',
  description:
    'Set a new password for your Mustafa Apparels account. The link from our email works once, for one hour after you ask for it.',
  path: '/reset-password',
  noindex: true,
  nofollow: true,
});

// The emailed link checks the token, then lands here with ?token=, or ?error= when it's no good.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const parsed = resetPasswordParams.safeParse(await searchParams);
  const usable = parsed.success;
  const token = parsed.success ? parsed.data.token : '';
  return (
    <div className="mx-auto w-full max-w-md px-gutter pt-12 pb-section">
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-12 text-h1 font-light">Set a new password</h1>
      {usable ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-6 text-body-lg">
          <p role="alert">{AUTH_MESSAGES.linkExpired}</p>
          <Link href="/forgot-password" className="link">
            Ask for a new link
          </Link>
        </div>
      )}
    </div>
  );
}
