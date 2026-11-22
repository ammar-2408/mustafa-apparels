import * as categories from '@mustafa/core/categories';
import * as products from '@mustafa/core/products';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { MediaManager } from '../../../../components/media-manager';
import { OpenChecks } from '../../../../components/open-checks';
import { PageHeader } from '../../../../components/page-header';
import { ProductForm } from '../../../../components/product-form';
import { SuitStatus } from '../../../../components/suit-status';
import { stepsFor, SuitSteps } from '../../../../components/suit-steps';
import { requireAdminPage } from '../../../../lib/auth';
import { formatDate } from '../../../../lib/format';
import { cloudNameForPreviews } from '../../../../lib/media';

export const metadata: Metadata = { title: 'Edit suit' };

// ?saved=1 after the first save of a new suit; anything else is ignored.
const searchInput = z.object({ saved: z.literal('1').optional() }).catch({});

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// A suit, top to bottom in the order it is added (owner, 2026-11-22: make adding suits easy):
// the step bar, Details, Photos, any open checks, then Publish. The step bar uses the same rules
// as the Publish button (core publishErrors), so the two always agree.
export default async function EditSuitPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const { saved } = searchInput.parse(await searchParams);
  const db = getDb();
  const [suit, collections] = await Promise.all([
    products.getById(db, id),
    categories.list(db, { includeHidden: true }),
  ]);
  if (!suit) notFound();
  const { media, ...fields } = suit;
  const steps = stepsFor({ problems: products.publishErrors(suit, media), status: suit.status });
  return (
    <>
      <PageHeader eyebrow={suit.designCode ?? 'No design code'} title={suit.name} />
      <SuitSteps steps={steps} />

      <h2 id="details" className="mb-6 scroll-mt-8 font-serif text-h3 text-deep">
        Details
      </h2>
      <ProductForm
        collections={collections.map((c) => ({
          value: c.id,
          label: c.isActive ? c.name : `${c.name} (hidden)`,
        }))}
        suit={fields}
      />

      <div className="mt-16 mb-12 scroll-mt-8">
        {saved && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-border bg-bg p-4 text-body text-success shadow-soft"
          >
            Saved. Now add photos.
          </p>
        )}
        <MediaManager
          productId={suit.id}
          cloudName={cloudNameForPreviews()}
          media={media.map((m) => ({
            id: m.id,
            kind: m.kind,
            publicId: m.publicId,
            alt: m.alt,
            isPrimary: m.isPrimary,
            posterPublicId: m.posterPublicId,
            durationSeconds: m.durationSeconds === null ? null : Number(m.durationSeconds),
          }))}
        />
      </div>

      <OpenChecks id={suit.id} checks={products.openChecks(suit.attributes)} />
      <div id="publish" className="scroll-mt-8">
        <SuitStatus
          id={suit.id}
          status={suit.status}
          publishedOn={suit.publishedAt ? formatDate(suit.publishedAt) : null}
        />
      </div>
    </>
  );
}
