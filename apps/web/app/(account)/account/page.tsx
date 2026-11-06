import * as account from '@mustafa/core/account';
import { getDb } from '@mustafa/db/client';
import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  DeleteAccount,
  ProfileForm,
  SavedSuitRemove,
  SessionButtons,
} from '../../../components/account/account-forms';
import { LogoutButton } from '../../../components/auth/logout-button';
import { ProductCard } from '../../../components/product/product-card';
import { requireUserPage } from '../../../lib/auth';
import { buildMetadata } from '../../../lib/seo';
import { deleteAccount, toggleWishlist, updateProfile } from './actions';

export const metadata = buildMetadata({
  title: 'Your account',
  description:
    'Your Mustafa Apparels account: your details, the unstitched suits you saved and the questions you sent us about them.',
  path: '/account',
  noindex: true,
  nofollow: true,
});

const STATUS: Record<string, string> = {
  new: 'Sent',
  contacted: 'We replied',
  closed: 'Closed',
};

const dateFormat = new Intl.DateTimeFormat('en-PK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Karachi',
});

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-border py-12">
      <h2 id={id} className="mb-8 text-h3 font-light">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Per request (it reads the session): profile, saved suits, questions sent, sessions, delete.
export default async function AccountPage() {
  const { user } = await requireUserPage();
  const db = getDb();
  const [saved, questions] = await Promise.all([
    account.savedSuits(db, user.id),
    account.myInquiries(db, user.id),
  ]);
  return (
    <>
      <p className="caps-tight text-muted sm:caps">Account</p>
      <h1 className="mt-4 mb-4 text-h1 font-light">Your account</h1>
      <p className="mb-12 text-body text-muted">{user.email}</p>

      <Section id="profile" title="Your details">
        <ProfileForm
          name={user.name}
          phone={(user as { phone?: string | null }).phone ?? null}
          save={updateProfile}
        />
      </Section>

      <Section id="saved" title="Saved suits">
        {saved.length === 0 ? (
          <p className="text-body">
            Tap the heart on any suit to keep it here.{' '}
            <Link href="/shop" className="link">
              See all suits
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-grid gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {saved.map((suit) => (
              <li key={suit.id} className="flex flex-col gap-2">
                <ProductCard suit={suit} />
                <SavedSuitRemove productId={suit.id} name={suit.name} remove={toggleWishlist} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="questions" title="Your questions">
        {questions.length === 0 ? (
          <p className="text-body">Questions you send from a suit&rsquo;s page show up here.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {questions.map((q) => (
              <li key={q.id} className="flex flex-col gap-2 py-6">
                <p className="text-small text-muted">
                  {dateFormat.format(q.createdAt)} · {STATUS[q.status] ?? q.status}
                  {q.suitSlug && (
                    <>
                      {' · '}
                      <Link href={`/products/${q.suitSlug}`} className="link">
                        {q.suitName}
                      </Link>
                    </>
                  )}
                </p>
                <p className="whitespace-pre-line text-body">{q.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="sessions" title="Logging out">
        <div className="flex flex-col gap-3 sm:flex-row">
          <LogoutButton />
          <SessionButtons />
        </div>
      </Section>

      <Section id="delete" title="Delete your account">
        <DeleteAccount remove={deleteAccount} />
      </Section>
    </>
  );
}
