import * as categories from '@mustafa/core/categories';
import * as products from '@mustafa/core/products';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MediaManager } from '../../../../components/media-manager';
import { ProductForm } from '../../../../components/product-form';
import { requireAdminPage } from '../../../../lib/auth';
import { cloudNameForPreviews } from '../../../../lib/media';

export const metadata: Metadata = { title: 'Edit suit' };

export default async function EditSuitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const db = getDb();
  const [suit, collections] = await Promise.all([
    products.getById(db, id),
    categories.list(db, { includeHidden: true }),
  ]);
  if (!suit) notFound();
  const { media, ...fields } = suit;
  return (
    <>
      <p className="caps-tight text-muted">{suit.designCode ?? 'No design code'}</p>
      <h1 className="mt-2 mb-10 text-h2 font-light">{suit.name}</h1>
      <div className="mb-16">
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
      <h2 className="mb-6 text-h3 font-light">Details</h2>
      <ProductForm
        collections={collections.map((c) => ({
          value: c.id,
          label: c.isActive ? c.name : `${c.name} (hidden)`,
        }))}
        suit={fields}
      />
    </>
  );
}
