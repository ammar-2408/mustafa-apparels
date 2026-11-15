import * as search from '@mustafa/core/search';
import { getDb } from '@mustafa/db/client';
import { searchInput } from '@mustafa/validators/search';
import { headers } from 'next/headers';
import Link from 'next/link';

import { ProductGrid } from '../../../components/product/product-grid';
import { SearchBox } from '../../../components/search/search-box';
import { SEARCH_LIMITS } from '../../../lib/search-limits';
import { buildMetadata } from '../../../lib/seo';
import { withinLimit } from '../../../lib/services';

export const metadata = buildMetadata({
  title: 'Search suits',
  description:
    'Search Mustafa Apparels unstitched suits by name, fabric, colour, design or design code, across the Dhanak, Khaddar and Lajwanti collections.',
  path: '/search',
  noindex: true,
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Live per request (Tier B, proxy.ts nonce). Typos are forgiven by core search (docs/database.md §4).
export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = one(params.q) ?? '';
  const parsed = searchInput.safeParse({ q: raw, page: one(params.page) ?? 1 });
  const ip = (await headers()).get('x-nf-client-connection-ip') ?? 'no-ip';

  let body;
  if (!raw.trim()) {
    body = <p className="text-body-lg">Type a name, a fabric, a colour or a design code.</p>;
  } else if (!parsed.success) {
    body = <p className="text-body-lg">Type 2 to 60 letters or numbers to search.</p>;
  } else if (!(await withinLimit(SEARCH_LIMITS.page, ip))) {
    body = (
      <p role="alert" className="text-body-lg">
        Too many searches at once. Please wait a minute and try again.
      </p>
    );
  } else {
    const found = await search.search(getDb(), parsed.data);
    const { q, page } = parsed.data;
    body =
      found.total > 0 && page > found.pageCount ? (
        // A page number past the end: point back to the results rather than show an empty grid.
        <p className="text-body-lg">
          There are only {found.pageCount} {found.pageCount === 1 ? 'page' : 'pages'} of results.{' '}
          <Link href={`/search?q=${encodeURIComponent(q)}`} className="link">
            See the first page
          </Link>
        </p>
      ) : found.total === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-body-lg">No suits match &ldquo;{q}&rdquo;.</p>
          <p className="text-body">
            Try a fabric such as Dhanak or Khaddar, a colour, or{' '}
            <Link href="/shop" className="link">
              see all suits
            </Link>
            .
          </p>
        </div>
      ) : (
        <div>
          <p className="caps-tight mb-8 text-muted" role="status">
            {found.total} {found.total === 1 ? 'suit' : 'suits'} for &ldquo;{q}&rdquo;
          </p>
          <ProductGrid suits={found.items} eager={0} />
          {found.pageCount > 1 && (
            <nav aria-label="Pages of results" className="mt-16 flex justify-center gap-4">
              {page > 1 && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
                  className="link caps-tight py-3"
                >
                  Previous
                </Link>
              )}
              <span className="py-3">
                Page {page} of {found.pageCount}
              </span>
              {page < found.pageCount && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
                  className="link caps-tight py-3"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      );
  }

  return (
    <>
      <h1 className="mb-8 text-h1 font-light">Search</h1>
      <div className="mb-12 max-w-2xl">
        <SearchBox defaultValue={raw} />
      </div>
      {body}
    </>
  );
}
