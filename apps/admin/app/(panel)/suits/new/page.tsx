import * as categories from '@mustafa/core/categories';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';

import { ProductForm } from '../../../../components/product-form';
import { requireAdminPage } from '../../../../lib/auth';

export const metadata: Metadata = { title: 'New suit' };

export default async function NewSuitPage() {
  await requireAdminPage();
  const collections = await categories.list(getDb(), { includeHidden: true });
  return (
    <>
      <h1 className="mb-2 text-h2 font-light">New suit</h1>
      <p className="mb-10 text-small text-muted">
        Saved as a draft. Add photos and a price on the next page, then publish.
      </p>
      <ProductForm
        collections={collections.map((c) => ({
          value: c.id,
          label: c.isActive ? c.name : `${c.name} (hidden)`,
        }))}
      />
    </>
  );
}
