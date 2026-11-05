import * as products from '@mustafa/core/products';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MediaManager } from '../../../../components/media-manager';
import { requireAdminPage } from '../../../../lib/auth';
import { cloudNameForPreviews } from '../../../../lib/media';

export const metadata: Metadata = { title: 'Edit suit' };

export default async function EditSuitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const suit = await products.getById(getDb(), id);
  if (!suit) notFound();
  return (
    <>
      <p className="caps-tight text-muted">{suit.designCode ?? 'No design code'}</p>
      <h1 className="mt-2 mb-10 text-h2 font-light">{suit.name}</h1>
      <MediaManager
        productId={suit.id}
        cloudName={cloudNameForPreviews()}
        media={suit.media.map((m) => ({
          id: m.id,
          kind: m.kind,
          publicId: m.publicId,
          alt: m.alt,
          isPrimary: m.isPrimary,
          posterPublicId: m.posterPublicId,
          durationSeconds: m.durationSeconds === null ? null : Number(m.durationSeconds),
        }))}
      />
    </>
  );
}
