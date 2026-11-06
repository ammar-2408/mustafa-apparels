import * as categories from '@mustafa/core/categories';
import { imageThumbUrl } from '@mustafa/core/media-url';
import { getDb } from '@mustafa/db/client';
import { buttonClass } from '@mustafa/ui/button';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CollectionList } from '../../../components/collection-list';
import { requireAdminPage } from '../../../lib/auth';
import { cloudNameForPreviews } from '../../../lib/media';

export const metadata: Metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  await requireAdminPage();
  const rows = await categories.adminList(getDb());
  const cloudName = cloudNameForPreviews();
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-light">Collections</h1>
          <p className="mt-2 text-small text-muted">
            Drag or use the arrows to set the order shoppers see. Hidden collections stay off the
            shop.
          </p>
        </div>
        <Link href="/collections/new" className={buttonClass('primary')}>
          New collection
        </Link>
      </div>
      <CollectionList
        collections={rows.map(({ id, name, slug, isActive, productCount, imagePublicId }) => ({
          id,
          name,
          slug,
          isActive,
          productCount,
          thumbUrl: imagePublicId ? imageThumbUrl(cloudName, imagePublicId, 120) : null,
        }))}
      />
    </>
  );
}
