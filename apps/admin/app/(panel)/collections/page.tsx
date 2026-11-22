import * as categories from '@mustafa/core/categories';
import { imageThumbUrl } from '@mustafa/core/media-url';
import { getDb } from '@mustafa/db/client';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CollectionList } from '../../../components/collection-list';
import { PageHeader } from '../../../components/page-header';
import { requireAdminPage } from '../../../lib/auth';
import { cloudNameForPreviews } from '../../../lib/media';

export const metadata: Metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  await requireAdminPage();
  const rows = await categories.adminList(getDb());
  const cloudName = cloudNameForPreviews();
  return (
    <>
      <PageHeader
        title="Collections"
        subtitle="Drag or use the arrows to set the order shoppers see. Hidden collections stay off the shop."
        action={
          <Link href="/collections/new" className={buttonClass('primary')}>
            New collection
            <ButtonCircle />
          </Link>
        }
      />
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
