import * as categories from '@mustafa/core/categories';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';

import { PageHeader } from '../../../../components/page-header';
import { ProductForm } from '../../../../components/product-form';
import { stepsFor, SuitSteps } from '../../../../components/suit-steps';
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
      <SuitSteps steps={stepsFor({ isNew: true })} isNew />
      <ProductForm
        collections={collections.map((c) => ({
          value: c.id,
          label: c.isActive ? c.name : `${c.name} (hidden)`,
        }))}
      />
    </>
  );
}
