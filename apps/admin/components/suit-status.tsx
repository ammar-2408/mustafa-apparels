'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  archiveProduct,
  duplicateProduct,
  restoreProduct,
  setProductStatus,
} from '../app/(panel)/suits/actions';
import { PRODUCT_FIELDS } from '../lib/product-fields';

type Status = 'draft' | 'published' | 'archived';

type SuitStatusProps = {
  id: string;
  status: Status;
  publishedOn: string | null;
};

type Problem = { key: string; label: string; href: string; messages: string[] };

// Where each publish problem is fixed on this page.
function problemsOf(fieldErrors: Record<string, string[]>): Problem[] {
  return Object.entries(fieldErrors).map(([key, messages]) => {
    if (key === 'media') return { key, label: 'Photos', href: '#media-heading', messages };
    if (key === 'checks') return { key, label: 'Open checks', href: '#checks-heading', messages };
    const field = PRODUCT_FIELDS.find((f) => f.name === key);
    return { key, label: field?.label ?? key, href: `#field-${key}`, messages };
  });
}

const STATUS_TEXT: Record<Status, string> = {
  draft: 'Draft: not on the shop.',
  published: 'Published: on the shop.',
  archived: 'Archived: off the shop and out of the everyday list.',
};

// The suit's status and what can be done next. Publishing reports every missing requirement at
// once, each linked to the place on this page where it is fixed.
export function SuitStatus({ id, status, publishedOn }: SuitStatusProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [error, setError] = useState('');

  async function run(
    action: () => Promise<{
      ok: boolean;
      error?: { message: string; fieldErrors?: Record<string, string[]> };
      data?: unknown;
    }>,
  ) {
    setPending(true);
    setError('');
    setProblems([]);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      const fieldErrors = result.error?.fieldErrors ?? {};
      if (Object.keys(fieldErrors).length > 0) setProblems(problemsOf(fieldErrors));
      else setError(result.error?.message ?? 'Something went wrong. Please try again.');
      return null;
    }
    return result.data;
  }

  async function duplicate() {
    const data = (await run(() => duplicateProduct({ id }))) as { id: string } | null;
    if (data) router.push(`/suits/${data.id}`);
  }

  return (
    <section
      aria-labelledby="status-heading"
      className="mb-12 flex flex-col gap-4 rounded-sm border border-border p-4"
    >
      <h2 id="status-heading" className="caps-tight">
        Status
      </h2>
      <p className="text-body">
        {STATUS_TEXT[status]}
        {status === 'published' && publishedOn ? ` First published ${publishedOn}.` : ''}
      </p>
      {problems.length > 0 ? (
        <div role="alert" className="flex flex-col gap-2">
          <p className="text-body text-error">Not published yet. Fix these first:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-small">
            {problems.map((problem) => (
              <li key={problem.key}>
                <a href={problem.href} className="underline underline-offset-4">
                  {problem.label}
                </a>
                : {problem.messages.join(' ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        {status === 'draft' ? (
          <Button
            disabled={pending}
            onClick={() => run(() => setProductStatus({ id, status: 'published' }))}
          >
            Publish
          </Button>
        ) : null}
        {status === 'published' ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => setProductStatus({ id, status: 'draft' }))}
          >
            Unpublish
          </Button>
        ) : null}
        {status === 'archived' ? (
          <Button disabled={pending} onClick={() => run(() => restoreProduct({ id }))}>
            Restore as draft
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => archiveProduct({ id }))}
          >
            Archive
          </Button>
        )}
        <Button variant="secondary" disabled={pending} onClick={duplicate}>
          Duplicate
        </Button>
      </div>
    </section>
  );
}
