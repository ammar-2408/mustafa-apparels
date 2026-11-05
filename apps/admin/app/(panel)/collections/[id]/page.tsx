import * as categories from '@mustafa/core/categories';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CollectionForm } from '../../../../components/collection-form';
import { CollectionImage } from '../../../../components/collection-image';
import { requireAdminPage } from '../../../../lib/auth';
import { cloudNameForPreviews } from '../../../../lib/media';

export const metadata: Metadata = { title: 'Edit collection' };

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const row = await categories.getById(getDb(), id);
  if (!row) notFound();
  return (
    <>
      <h1 className="mb-8 text-h2 font-light">{row.name}</h1>
      <div className="mb-12">
        <CollectionImage
          collectionId={row.id}
          name={row.name}
          cloudName={cloudNameForPreviews()}
          publicId={row.imagePublicId}
        />
      </div>
      <CollectionForm
        collection={{
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
        }}
      />
    </>
  );
}
