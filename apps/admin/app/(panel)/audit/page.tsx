import * as audit from '@mustafa/core/audit';
import { getDb } from '@mustafa/db/client';
import { buttonClass } from '@mustafa/ui/button';
import { Checkbox } from '@mustafa/ui/checkbox';
import { Select } from '@mustafa/ui/select';
import { auditListInput } from '@mustafa/validators/audit';
import type { Metadata } from 'next';
import Link from 'next/link';

import { requireAdminPage } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';

export const metadata: Metadata = { title: 'Audit log' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ENTITY_LABEL: Record<string, string> = {
  product: 'Suit',
  category: 'Collection',
  setting: 'Setting',
  inquiry: 'Inquiry',
};

// Where the changed record lives in the admin; a deleted suit or collection simply 404s there.
function recordHref(entity: string, entityId: string | null) {
  if (entity === 'product' && entityId) return `/suits/${entityId}`;
  if (entity === 'category' && entityId) return `/collections/${entityId}`;
  if (entity === 'setting') return '/settings';
  if (entity === 'inquiry') return '/inquiries';
  return null;
}

function readInput(params: Record<string, string | string[] | undefined>) {
  const plain = Object.fromEntries(
    Object.entries(params).filter(
      (e): e is [string, string] => typeof e[1] === 'string' && e[1] !== '',
    ),
  );
  const parsed = auditListInput.safeParse(plain);
  return parsed.success ? parsed.data : auditListInput.parse({});
}

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const input = readInput(await searchParams);
  const db = getDb();
  const [result, actors] = await Promise.all([
    audit.list(db, {
      entity: input.entity,
      actorId: input.actor,
      hideRemoved: !input.removed,
      page: input.page,
    }),
    audit.actors(db),
  ]);
  const href = (page: number) => {
    const query = new URLSearchParams();
    if (input.entity) query.set('entity', input.entity);
    if (input.actor) query.set('actor', input.actor);
    if (input.removed) query.set('removed', '1');
    if (page > 1) query.set('page', String(page));
    const text = query.toString();
    return text ? `/audit?${text}` : '/audit';
  };

  return (
    <>
      <h1 className="mb-2 text-h2 font-light">Audit log</h1>
      <p className="mb-8 text-small text-muted">
        Every change made in the admin, newest first. Entries can&apos;t be edited or removed.
      </p>
      <form
        method="get"
        action="/audit"
        aria-label="Filter the audit log"
        className="mb-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <Select
          label="What"
          name="entity"
          placeholder="Everything"
          defaultValue={input.entity ?? ''}
          options={Object.entries(ENTITY_LABEL).map(([value, label]) => ({
            value,
            label: `${label}s`,
          }))}
        />
        <Select
          label="Who"
          name="actor"
          placeholder="Everyone"
          defaultValue={input.actor ?? ''}
          options={actors.map((a) => ({ value: a.id, label: a.name }))}
        />
        <button type="submit" className={buttonClass('primary')}>
          Show
        </button>
        <Checkbox
          label="Show removed accounts"
          name="removed"
          value="1"
          defaultChecked={input.removed}
          className="sm:col-span-3"
        />
      </form>

      {result.items.length === 0 ? (
        <p className="text-body text-muted">
          No changes recorded
          {input.entity || input.actor || input.removed ? ' for this filter' : ' yet'}.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {result.items.map((item) => {
            const link = recordHref(item.entity, item.entityId);
            const label = `${ENTITY_LABEL[item.entity] ?? item.entity}${item.entity === 'setting' && item.entityId ? `: ${item.entityId}` : ''}`;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-sm border border-border p-3 text-small"
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <time dateTime={item.createdAt.toISOString()} className="text-muted">
                    {formatDateTime(item.createdAt)}
                  </time>
                  <span>{item.actor?.name ?? 'A removed account'}</span>
                  <code className="font-sans">{item.action}</code>
                  {link ? (
                    <Link href={link} className="underline underline-offset-4">
                      {label}
                    </Link>
                  ) : (
                    <span>{label}</span>
                  )}
                </div>
                {item.changes && Object.keys(item.changes as object).length > 0 ? (
                  <details>
                    <summary className="caps-tight min-h-11 cursor-pointer py-2">
                      Before and after
                    </summary>
                    {/* Text only: React escapes it, so stored values can never run as HTML. */}
                    <pre className="overflow-x-auto rounded-sm border border-border bg-surface p-3 text-label whitespace-pre-wrap break-words">
                      {JSON.stringify(item.changes, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center gap-4">
          {result.page > 1 ? (
            <Link href={href(result.page - 1)} className={buttonClass('secondary')}>
              Newer
            </Link>
          ) : null}
          <span className="text-small">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={href(result.page + 1)} className={buttonClass('secondary')}>
              Older
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
