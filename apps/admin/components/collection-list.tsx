'use client';

import { FormError } from '@mustafa/ui/form-error';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { reorderCategories, setCategoryActive } from '../app/(panel)/collections/actions';
import { SortableList } from './sortable-list';
import { Thumb } from './thumb';

export type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  productCount: number;
  // The collection image as a small delivery URL, or null when it has none.
  thumbUrl: string | null;
};

// The order here is the order on the storefront. Each change saves at once.
export function CollectionList({ collections }: { collections: CollectionRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(collections);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const save = async (run: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
    setPending(true);
    setError('');
    const result = await run();
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? 'Something went wrong. Please try again.');
      setItems(collections);
      return false;
    }
    router.refresh();
    return true;
  };

  const reorder = async (ids: string[]) => {
    const byId = new Map(items.map((item) => [item.id, item]));
    setItems(ids.map((id) => byId.get(id)!).filter(Boolean));
    if (await save(() => reorderCategories({ ids }))) setStatus('New order saved.');
  };

  const toggle = async (item: CollectionRow) => {
    const isActive = !item.isActive;
    setItems((current) => current.map((c) => (c.id === item.id ? { ...c, isActive } : c)));
    if (await save(() => setCategoryActive({ id: item.id, isActive }))) {
      setStatus(`${item.name} is now ${isActive ? 'shown' : 'hidden'} on the shop.`);
    }
  };

  if (items.length === 0) {
    return <p className="text-body text-muted">No collections yet. Create the first one.</p>;
  }

  return (
    <>
      <FormError message={error} />
      <p role="status" className="sr-only">
        {status}
      </p>
      <SortableList
        items={items}
        onReorder={reorder}
        labelOf={(item) => item.name}
        disabled={pending}
        renderItem={(item) => (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Thumb src={item.thumbUrl} />
            <Link
              href={`/collections/${item.id}`}
              className="text-body underline-offset-4 hover:underline"
            >
              {item.name}
            </Link>
            <span className="text-small text-muted">
              {item.productCount} {item.productCount === 1 ? 'suit' : 'suits'}
            </span>
            {item.isActive ? null : (
              <span className="caps-tight rounded-full bg-accent px-2 py-1 text-accent-fg">
                Hidden
              </span>
            )}
            <button
              type="button"
              className="caps-tight ml-auto min-h-11 px-2 underline-offset-4 hover:underline"
              disabled={pending}
              onClick={() => toggle(item)}
            >
              {item.isActive ? `Hide ${item.name}` : `Show ${item.name}`}
            </button>
          </div>
        )}
      />
    </>
  );
}
