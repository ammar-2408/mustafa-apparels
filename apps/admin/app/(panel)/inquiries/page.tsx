import { mailtoLink, telLink, whatsappLink } from '@mustafa/core/contact-links';
import * as inquiries from '@mustafa/core/inquiries';
import { getDb } from '@mustafa/db/client';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';
import { INQUIRY_STATUSES, inquiryListInput } from '@mustafa/validators/inquiry';
import type { Metadata } from 'next';
import Link from 'next/link';

import { InquiryStatus } from '../../../components/inquiry-status';
import { requireAdminPage } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';

export const metadata: Metadata = { title: 'Inquiries' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TAB_LABEL = { new: 'New', contacted: 'Contacted', closed: 'Closed' } as const;

function readInput(params: Record<string, string | string[] | undefined>) {
  const plain = Object.fromEntries(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
  const parsed = inquiryListInput.safeParse(plain);
  return parsed.success ? parsed.data : inquiryListInput.parse({});
}

const greeting = (name: string, product: string | null) =>
  `Hi ${name}, thank you for your message to Mustafa Apparels${product ? ` about "${product}"` : ''}.`;

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const input = readInput(await searchParams);
  const db = getDb();
  const [result, counts] = await Promise.all([inquiries.list(db, input), inquiries.counts(db)]);
  const href = (status: string, page = 1) =>
    `/inquiries?status=${status}${page > 1 ? `&page=${page}` : ''}`;

  return (
    <>
      <h1 className="mb-8 text-h2 font-light">Inquiries</h1>
      <nav aria-label="Inquiry status" className="mb-8 flex flex-wrap gap-2">
        {INQUIRY_STATUSES.map((status) => (
          <Link
            key={status}
            href={href(status)}
            aria-current={status === input.status ? 'page' : undefined}
            className={`caps-tight inline-flex min-h-11 items-center rounded-sm border px-4 ${
              status === input.status
                ? 'border-action bg-action text-action-fg'
                : 'border-border-strong'
            }`}
          >
            {TAB_LABEL[status]} ({counts[status]})
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <p className="text-body text-muted">
          No {TAB_LABEL[input.status].toLowerCase()} inquiries.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {result.items.map((item) => {
            const text = greeting(item.name, item.productName);
            return (
              <li key={item.id} className="flex flex-col gap-3 rounded-sm border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-body">{item.name}</h2>
                  <time dateTime={item.createdAt.toISOString()} className="text-small text-muted">
                    {formatDateTime(item.createdAt)}
                  </time>
                </div>
                {item.productId ? (
                  <p className="text-small">
                    About{' '}
                    <Link
                      href={`/suits/${item.productId}`}
                      className="underline underline-offset-4"
                    >
                      {item.productName}
                      {item.productCode ? ` (${item.productCode})` : ''}
                    </Link>
                  </p>
                ) : null}
                {/* Plain text: React escapes it, and line breaks are kept. */}
                <p className="text-body whitespace-pre-wrap">{item.message}</p>
                <p className="text-small text-muted">
                  {[item.phone, item.email].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-3">
                  {item.phone ? (
                    <a
                      href={whatsappLink(item.phone, text)}
                      className={buttonClass('primary')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                      <ButtonCircle />
                    </a>
                  ) : null}
                  {item.phone ? (
                    <a href={telLink(item.phone)} className={buttonClass('secondary')}>
                      Call
                      <ButtonCircle />
                    </a>
                  ) : null}
                  {item.email ? (
                    <a
                      href={mailtoLink(
                        item.email,
                        'Your inquiry to Mustafa Apparels',
                        `${text}\n\n`,
                      )}
                      className={buttonClass('secondary')}
                    >
                      Email
                      <ButtonCircle />
                    </a>
                  ) : null}
                </div>
                <InquiryStatus id={item.id} status={item.status} name={item.name} />
              </li>
            );
          })}
        </ul>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center gap-4">
          {result.page > 1 ? (
            <Link href={href(input.status, result.page - 1)} className={buttonClass('secondary')}>
              Previous
              <ButtonCircle direction="back" />
            </Link>
          ) : null}
          <span className="text-small">
            Page {result.page} of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link href={href(input.status, result.page + 1)} className={buttonClass('secondary')}>
              Next
              <ButtonCircle />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
