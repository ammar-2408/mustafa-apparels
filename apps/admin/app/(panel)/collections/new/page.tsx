import type { Metadata } from 'next';

import { CollectionForm } from '../../../../components/collection-form';
import { requireAdminPage } from '../../../../lib/auth';

export const metadata: Metadata = { title: 'New collection' };

export default async function NewCollectionPage() {
  await requireAdminPage();
  return (
    <>
      <h1 className="mb-8 text-h2 font-light">New collection</h1>
      <CollectionForm />
    </>
  );
}
