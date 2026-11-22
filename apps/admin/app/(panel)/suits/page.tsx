import * as categories from '@mustafa/core/categories';
import { imageThumbUrl } from '@mustafa/core/media-url';
import { adminList, type AdminListItem } from '@mustafa/core/products/admin-list';
import { getDb } from '@mustafa/db/client';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';
import { Checkbox } from '@mustafa/ui/checkbox';
import { Input } from '@mustafa/ui/input';
import { Select } from '@mustafa/ui/select';
import { adminProductListInput } from '@mustafa/validators/product';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Thumb } from '../../../components/thumb';
import { requireAdminPage } from '../../../lib/auth';
import { formatPrice } from '../../../lib/format';
import { cloudNameForPreviews } from '../../../lib/media';

export const metadata: Metadata = { title: 'Suits' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_LABEL = { draft: 'Draft', published: 'Published', archived: 'Archived' } as const;

// Only plain strings reach the schema; a repeated or unknown parameter shows the full list.
function readFilters(params: Record<string, string | string[] | undefined>) {
  const plain = Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
    ),
  );
  const parsed = adminProductListInput.safeParse(plain);
  return parsed.success ? parsed.data : adminProductListInput.parse({});
}

export default async function SuitsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const filters = readFilters(await searchParams);
  const db = getDb();
  const [result, collections] = await Promise.all([
    adminList(db, filters),
    categories.list(db, { includeHidden: true }),
  ]);
  const cloudName = cloudNameForPreviews();
  const filtered = Boolean(filters.q || filters.status || filters.collection || filters.needsPrice);

  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (filters.q) query.set('q', filters.q);
    if (filters.status) query.set('status', filters.status);
    if (filters.collection) query.set('collection', filters.collection);
    if (filters.needsPrice) query.set('needsPrice', '1');
    if (page > 1) query.set('page', String(page));
    const text = query.toString();
    return text ? `/suits?${text}` : '/suits';
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h2 font-light">Suits</h1>
        <Link href="/suits/new" className={buttonClass('primary')}>
          New suit
          <ButtonCircle />
        </Link>
      </div>

      <form
        method="get"
        action="/suits"
        role="search"
        aria-label="Find suits"
        className="mb-8 grid gap-4 md:grid-cols-[2fr_1fr_1fr] md:items-start"
      >
        <Input
          label="Search"
          name="q"
          type="search"
          defaultValue={filters.q ?? ''}
          maxLength={60}
          hint="Name, colour, fabric or design code"
        />
        <Select
          label="Status"
          name="status"
          placeholder="Draft and published"
          defaultValue={filters.status ?? ''}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
        <Select
          label="Collection"
          name="collection"
          placeholder="All collections"
          defaultValue={filters.collection ?? ''}
          options={collections.map((c) => ({
            value: c.id,
            label: c.isActive ? c.name : `${c.name} (hidden)`,
          }))}
        />
        <Checkbox
          label="Needs price"
          name="needsPrice"
          value="1"
          defaultChecked={filters.needsPrice}
        />
        <div className="flex flex-wrap gap-4 md:col-span-2 md:justify-end">
          <button type="submit" className={buttonClass('primary', 'min-h-12')}>
            Show suits
            <ButtonCircle />
          </button>
          {filtered ? (
            <Link href="/suits" className={buttonClass('secondary', 'min-h-12')}>
              Clear
              <ButtonCircle />
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mb-4 text-small text-muted" aria-live="polite">
        {result.total === 1 ? '1 suit' : `${result.total} suits`}
        {filtered ? ' match' : ''}
      </p>

      {result.items.length === 0 ? (
        <p className="text-body">
          {filtered
            ? 'No suits match. Try fewer filters.'
            : 'No suits yet. Add the first one, or import the stock.'}
        </p>
      ) : (
        <>
          {/* Phones: one card per suit. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {result.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/suits/${item.id}`}
                  className="flex gap-3 rounded-sm border border-border p-3 hover:border-border-strong"
                >
                  <Thumb
                    src={item.mainImage ? imageThumbUrl(cloudName, item.mainImage, 120) : null}
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body">{item.name}</span>
                    <span className="text-small text-muted">
                      {[item.designCode, item.collection].filter(Boolean).join(' · ')}
                    </span>
                    <Badges item={item} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* From md: a dense table. */}
          <table className="hidden w-full border-collapse text-left text-small md:table">
            <caption className="sr-only">Suits</caption>
            <thead>
              <tr className="border-b border-border-strong">
                <th scope="col" className="py-3 pr-3 caps-tight font-normal">
                  <span className="sr-only">Photo</span>
                </th>
                <th scope="col" className="py-3 pr-3 caps-tight font-normal">
                  Suit
                </th>
                <th scope="col" className="py-3 pr-3 caps-tight font-normal">
                  Code
                </th>
                <th scope="col" className="py-3 pr-3 caps-tight font-normal">
                  Collection
                </th>
                <th scope="col" className="py-3 pr-3 caps-tight font-normal">
                  Price
                </th>
                <th scope="col" className="py-3 caps-tight font-normal">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-2 pr-3">
                    <Thumb
                      src={item.mainImage ? imageThumbUrl(cloudName, item.mainImage, 120) : null}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/suits/${item.id}`}
                      className="text-body underline-offset-4 hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{item.designCode ?? '—'}</td>
                  <td className="py-2 pr-3">{item.collection}</td>
                  <td className="py-2 pr-3">
                    {item.price === null ? <NeedsPrice /> : formatPrice(item.price)}
                  </td>
                  <td className="py-2">
                    <StatusBadges item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center gap-4">
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className={buttonClass('secondary')} rel="prev">
              Previous
              <ButtonCircle direction="back" />
            </Link>
          ) : null}
          <span className="text-small">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={pageHref(result.page + 1)} className={buttonClass('secondary')} rel="next">
              Next
              <ButtonCircle />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

const NeedsPrice = () => (
  <span className="caps-tight rounded-sm bg-accent px-2 py-1 text-accent-fg">Needs price</span>
);

function StatusBadges({ item }: { item: AdminListItem }) {
  return (
    <span className="flex flex-wrap gap-2">
      <span className="caps-tight rounded-sm border border-border-strong px-2 py-1">
        {STATUS_LABEL[item.status]}
      </span>
      {item.openChecks > 0 ? (
        <span className="caps-tight rounded-sm border border-border-strong px-2 py-1">
          {item.openChecks} {item.openChecks === 1 ? 'check' : 'checks'}
        </span>
      ) : null}
    </span>
  );
}

function Badges({ item }: { item: AdminListItem }) {
  return (
    <span className="flex flex-wrap gap-2">
      <StatusBadges item={item} />
      {item.price === null ? (
        <NeedsPrice />
      ) : (
        <span className="text-small">{formatPrice(item.price)}</span>
      )}
    </span>
  );
}
