import * as customers from '@mustafa/core/customers';
import { getDb } from '@mustafa/db/client';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';
import { Input } from '@mustafa/ui/input';
import { customerListInput } from '@mustafa/validators/search';
import type { Metadata } from 'next';
import Link from 'next/link';

import { LabelSpacer } from '../../../components/label-spacer';
import { PageHeader } from '../../../components/page-header';
import { requireAdminPage } from '../../../lib/auth';
import { formatDate } from '../../../lib/format';

export const metadata: Metadata = { title: 'Customers' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readInput(params: Record<string, string | string[] | undefined>) {
  const plain = Object.fromEntries(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
  const parsed = customerListInput.safeParse(plain);
  return parsed.success ? parsed.data : customerListInput.parse({});
}

// Read-only (docs/prd.md A6): who has an account, since when, and how often they asked.
export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const input = readInput(await searchParams);
  const result = await customers.list(getDb(), input);
  const href = (page: number) => {
    const query = new URLSearchParams();
    if (input.q) query.set('q', input.q);
    if (page > 1) query.set('page', String(page));
    const text = query.toString();
    return text ? `/customers?${text}` : '/customers';
  };
  const notes = (c: (typeof result.items)[number]) =>
    [c.emailVerified ? null : 'Email not verified', c.banned ? 'Blocked' : null]
      .filter(Boolean)
      .join(' · ');

  return (
    <>
      <PageHeader title="Customers" />
      <form
        method="get"
        action="/customers"
        role="search"
        aria-label="Find customers"
        className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start"
      >
        <Input
          label="Search"
          name="q"
          type="search"
          defaultValue={input.q ?? ''}
          maxLength={80}
          hint="Name or email"
        />
        <div className="flex flex-col">
          <LabelSpacer />
          <button type="submit" className={buttonClass('primary', 'min-h-12')}>
            Search
            <ButtonCircle />
          </button>
        </div>
      </form>
      <p className="mb-4 text-small text-muted" aria-live="polite">
        {result.total === 1 ? '1 customer' : `${result.total} customers`}
      </p>

      {result.items.length === 0 ? (
        <p className="text-body">{input.q ? 'No customers match.' : 'No customer accounts yet.'}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {result.items.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-bg shadow-soft p-4"
              >
                <span className="text-body">{c.name}</span>
                <span className="text-small break-all">{c.email}</span>
                <span className="text-small text-muted">
                  Joined {formatDate(c.createdAt)} · {c.inquiries}{' '}
                  {c.inquiries === 1 ? 'inquiry' : 'inquiries'}
                </span>
                {notes(c) ? <span className="text-small text-muted">{notes(c)}</span> : null}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-bg shadow-soft md:block">
            <table className="w-full border-collapse text-left text-small">
              <caption className="sr-only">Customers</caption>
              <thead>
                <tr className="bg-surface-soft">
                  <th scope="col" className="px-4 py-3 caps-tight font-normal text-fg">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 caps-tight font-normal text-fg">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 caps-tight font-normal text-fg">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-3 caps-tight font-normal text-fg">
                    Inquiries
                  </th>
                  <th scope="col" className="px-4 py-3 caps-tight font-normal text-fg">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-soft/60">
                    <td className="px-4 py-3 text-body">{c.name}</td>
                    <td className="px-4 py-3 break-all">{c.email}</td>
                    <td className="px-4 py-3">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">{c.inquiries}</td>
                    <td className="px-4 py-3 text-muted">{notes(c) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center gap-4">
          {result.page > 1 ? (
            <Link href={href(result.page - 1)} className={buttonClass('secondary')}>
              Previous
              <ButtonCircle direction="back" />
            </Link>
          ) : null}
          <span className="text-small">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={href(result.page + 1)} className={buttonClass('secondary')}>
              Next
              <ButtonCircle />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
