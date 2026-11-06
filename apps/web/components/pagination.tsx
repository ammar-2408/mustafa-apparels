import Link from 'next/link';

import { pageHref } from '../lib/paging';

type Props = { base: string; page: number; pageCount: number };

const item = 'inline-flex min-h-11 min-w-11 items-center justify-center px-3';

// Real links to /page/<n> (ADR-017), so the pages work without JavaScript and crawlers reach
// every suit. Nothing at all when there's one page.
export function Pagination({ base, page, pageCount }: Props) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav aria-label="Pages" className="mt-16 flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        {page > 1 && (
          <li>
            <Link href={pageHref(base, page - 1)} rel="prev" className={`${item} link caps-tight`}>
              Previous
            </Link>
          </li>
        )}
        {pages.map((n) => (
          <li key={n}>
            {n === page ? (
              <span aria-current="page" className={`${item} border-b border-fg`}>
                <span className="sr-only">Page </span>
                {n}
              </span>
            ) : (
              <Link href={pageHref(base, n)} className={`${item} link`}>
                <span className="sr-only">Page </span>
                {n}
              </Link>
            )}
          </li>
        ))}
        {page < pageCount && (
          <li>
            <Link href={pageHref(base, page + 1)} rel="next" className={`${item} link caps-tight`}>
              Next
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
