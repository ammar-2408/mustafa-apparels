'use server';
import 'server-only';

import * as categories from '@mustafa/core/categories';
import { getDb } from '@mustafa/db/client';
import {
  categoryInput,
  categoryReorderInput,
  categoryUpdateInput,
  categoryVisibilityInput,
} from '@mustafa/validators/category';

import { adminAction } from '../../../lib/action';
import { revalidateStorefront } from '../../../lib/revalidate';

// Collection pages and every suit card show the collection's name, so both lists refresh.
const tagsFor = (...slugs: string[]) => [
  'categories',
  'products',
  ...[...new Set(slugs)].map((slug) => `category:${slug}`),
];

const create = adminAction(categoryInput, async (input, { session }) => {
  const row = await categories.create(getDb(), input, { actorId: session.user.id });
  await revalidateStorefront(tagsFor(row.slug));
  return { id: row.id };
});

const update = adminAction(categoryUpdateInput, async (input, { session }) => {
  const db = getDb();
  const before = await categories.getById(db, input.id);
  const row = await categories.update(db, input, { actorId: session.user.id });
  // The old slug's page now redirects, so it is refreshed along with the new one.
  await revalidateStorefront(tagsFor(...(before ? [before.slug] : []), row.slug));
  return { id: row.id, slug: row.slug };
});

const reorder = adminAction(categoryReorderInput, async (input, { session }) => {
  await categories.reorder(getDb(), input, { actorId: session.user.id });
  await revalidateStorefront(['categories']);
  return { count: input.ids.length };
});

const setActive = adminAction(categoryVisibilityInput, async (input, { session }) => {
  const row = await categories.update(getDb(), input, { actorId: session.user.id });
  await revalidateStorefront(tagsFor(row.slug));
  return { id: row.id, isActive: row.isActive };
});

// A 'use server' file exports async functions only.
export async function createCategory(raw: unknown) {
  return create(raw);
}

export async function updateCategory(raw: unknown) {
  return update(raw);
}

export async function reorderCategories(raw: unknown) {
  return reorder(raw);
}

export async function setCategoryActive(raw: unknown) {
  return setActive(raw);
}
