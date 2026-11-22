import * as categories from '@mustafa/core/categories';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';

import { PageHeader } from '../../../../components/page-header';
import { ProductForm } from '../../../../components/product-form';
import { requireAdminPage } from '../../../../lib/auth';

export const metadata: Metadata = { title: 'New suit' };

export default async function NewSuitPage() {
  await requireAdminPage();
  const collections = await categories.list(getDb(), { includeHidden: true });
  return (
    <>
      <PageHeader
        title="New suit"
        subtitle="Saved as a draft. Add photos and a price on the next page, then publish."
      />
      <ProductForm
        collections={collections.map((c) => ({
          value: c.id,
          label: c.isActive ? c.name : `${c.name} (hidden)`,
        }))}
      />
    </>
  );
}
