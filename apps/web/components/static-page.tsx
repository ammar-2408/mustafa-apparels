import Link from 'next/link';
import type { ReactNode } from 'react';

import { breadcrumbList } from '../lib/structured-data';
import { JsonLd } from './json-ld';

type Props = { title: string; path: string; lead?: ReactNode; children: ReactNode };

// About, Contact, How to Order, FAQ, Privacy and Terms (docs/design.md §9.1): a large heading, a
// lead sentence, then readable text no wider than about 70 characters.
export function StaticPage({ title, path, lead, children }: Props) {
  return (
    <article className="mx-auto max-w-content-wide px-gutter pt-12 pb-section md:pt-16">
      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: title, path },
        ])}
      />
      <nav aria-label="Breadcrumb" className="mb-8 text-small text-muted">
        <Link href="/" className="link">
          Home
        </Link>{' '}
        <span aria-hidden="true">/</span> <span aria-current="page">{title}</span>
      </nav>
      <h1 className="max-w-4xl text-h1 font-light">{title}</h1>
      {lead && <div className="mt-8 max-w-3xl text-body-lg">{lead}</div>}
      <div className="mt-16 flex max-w-prose flex-col gap-12 text-body">{children}</div>
    </article>
  );
}

export function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h3 font-light">{title}</h2>
      {children}
    </section>
  );
}
