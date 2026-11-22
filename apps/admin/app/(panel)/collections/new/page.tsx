import type { Metadata } from 'next';

import { CollectionForm } from '../../../../components/collection-form';
import { PageHeader } from '../../../../components/page-header';
import { requireAdminPage } from '../../../../lib/auth';

export const metadata: Metadata = { title: 'New collection' };

export default async function NewCollectionPage() {
  await requireAdminPage();
  return (
    <>
      <PageHeader title="New collection" />
      <CollectionForm />
    </>
  );
}
