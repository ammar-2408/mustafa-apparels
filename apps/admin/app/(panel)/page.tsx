import { counts } from '@mustafa/core/dashboard';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';
import Link from 'next/link';

import { requireAdminPage } from '../../lib/auth';

export const metadata: Metadata = { title: 'Dashboard' };

type Tile = { label: string; value: number; href: string; hint?: string };

// The check runs here as well as in the layout and proxy.ts: the proxy only sees that a cookie
// exists, and a page must never rely on its layout for access.
export default async function Dashboard() {
  await requireAdminPage();
  const c = await counts(getDb());

  const groups: { title: string; tiles: Tile[] }[] = [
    {
      title: 'Suits',
      tiles: [
        { label: 'Published', value: c.published, href: '/suits?status=published' },
        { label: 'Drafts', value: c.drafts, href: '/suits?status=draft' },
        {
          label: 'Needs price',
          value: c.needsPrice,
          href: '/suits?needsPrice=1',
          hint: 'Add a price before publishing',
        },
        { label: 'Archived', value: c.archived, href: '/suits?status=archived' },
      ],
    },
    {
      title: 'Shop',
      tiles: [
        { label: 'New inquiries', value: c.newInquiries, href: '/inquiries' },
        { label: 'Customers', value: c.customers, href: '/customers' },
        {
          label: 'Collections',
          value: c.collections,
          href: '/collections',
          ...(c.hiddenCollections > 0 && { hint: `${c.hiddenCollections} hidden` }),
        },
      ],
    },
  ];

  return (
    <>
      <h1 className="mb-10 text-h2 font-light">Dashboard</h1>
      {groups.map(({ title, tiles }) => (
        <section key={title} aria-labelledby={`group-${title}`} className="mb-10">
          <h2 id={`group-${title}`} className="caps-tight mb-4 text-muted sm:caps">
            {title}
          </h2>
          <ul className="grid grid-cols-2 gap-grid lg:grid-cols-4">
            {tiles.map(({ label, value, href, hint }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex h-full min-h-28 flex-col gap-3 rounded-sm border border-border p-4 hover:border-border-strong"
                >
                  <span className="caps-tight">{label}</span>
                  <span>
                    <span className="block text-h2 font-light" data-testid={`count-${label}`}>
                      {value}
                    </span>
                    {hint && <span className="text-small text-muted">{hint}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
