import { ButtonCircle, buttonClass } from '@mustafa/ui/button';
import Link from 'next/link';

import { OpenSearchButton } from './site/open-search';

// The branded 404 (docs/design.md §8.6), shared by the root and the (shop) not-found pages.
export function NotFoundContent() {
  return (
    <div className="mx-auto max-w-content-wide px-gutter py-section">
      <p className="caps-tight text-muted">404</p>
      <h1 className="mt-4 max-w-3xl text-h1 font-light">We can&rsquo;t find that page</h1>
      <p className="mt-8 max-w-2xl text-body-lg">
        The suit or page may have moved, or the link may be mistyped. Try all suits, search, or ask
        us on WhatsApp.
      </p>
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link href="/shop" className={buttonClass('primary')}>
          See all suits
          <ButtonCircle />
        </Link>
        <OpenSearchButton className={buttonClass('secondary')}>
          Search
          <ButtonCircle />
        </OpenSearchButton>
      </div>
    </div>
  );
}
