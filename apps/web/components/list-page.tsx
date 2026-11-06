import { PAGE_SIZE } from '@mustafa/core/products';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { breadcrumbList, type Crumb, itemList } from '../lib/structured-data';
import type { SuitCard } from '../lib/types';
import { JsonLd } from './json-ld';
import { Pagination } from './pagination';
import { ProductGrid } from './product/product-grid';

type Props = {
  title: string;
  intro?: ReactNode;
  crumbs: Crumb[];
  base: string;
  list: { items: SuitCard[]; total: number; page: number; pageCount: number };
};

const suitsLabel = (n: number) => `${n} ${n === 1 ? 'suit' : 'suits'}`;

// The shared body of /shop and collection pages, page 1 or later: breadcrumbs, a large heading,
// the count, the grid and real page links. Filters arrive in step 6.4a, in the browser.
export function ListPage({ title, intro, crumbs, base, list }: Props) {
  const firstPosition = (list.page - 1) * PAGE_SIZE + 1;
  return (
    <div className="mx-auto max-w-content-wide px-gutter pt-12 pb-section md:pt-16">
      <JsonLd data={breadcrumbList(crumbs)} />
      <JsonLd data={itemList(title, list.items, firstPosition)} />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-2 text-small text-muted">
          {crumbs.map((crumb, i) => (
            <li key={crumb.path} className="flex gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < crumbs.length - 1 ? (
                <Link href={crumb.path} className="link">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current="page">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <header className="mt-8 mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-h1 font-light">
            {title}
            {list.page > 1 && (
              <span className="block text-h3 font-light text-muted">Page {list.page}</span>
            )}
          </h1>
          {intro && <div className="mt-6 text-body-lg">{intro}</div>}
        </div>
        <p className="caps-tight text-muted" aria-live="polite">
          {suitsLabel(list.total)}
        </p>
      </header>
      {list.items.length > 0 ? (
        <ProductGrid suits={list.items} eager={list.page === 1 ? 4 : 0} />
      ) : (
        <p className="text-body-lg">
          New suits are on their way. Ask us on WhatsApp what&rsquo;s coming.
        </p>
      )}
      <Pagination base={base} page={list.page} pageCount={list.pageCount} />
    </div>
  );
}
