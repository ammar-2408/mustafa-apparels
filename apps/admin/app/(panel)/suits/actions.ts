'use server';
import 'server-only';

import * as categories from '@mustafa/core/categories';
import * as products from '@mustafa/core/products';
import { getDb } from '@mustafa/db/client';
import { productCreateInput, productEditInput } from '@mustafa/validators/product';
import { revalidatePath } from 'next/cache';

import { adminAction } from '../../../lib/action';
import { revalidateStorefront } from '../../../lib/revalidate';

const slugOf = async (categoryId: string) =>
  (await categories.getById(getDb(), categoryId))?.slug ?? null;

// Lists show the suit's card, its page shows the rest, and its collection pages list it.
const storefrontTags = (productId: string, ...collectionSlugs: (string | null)[]) => [
  'products',
  `product:${productId}`,
  ...[...new Set(collectionSlugs.filter(Boolean))].map((slug) => `category:${slug}`),
];

// Always a draft (core refuses anything else). Photos are added on the edit page that follows.
const create = adminAction(productCreateInput, async (input, { session }) => {
  const row = await products.create(
    getDb(),
    { ...input, status: 'draft', attributes: {} },
    { actorId: session.user.id },
  );
  await revalidateStorefront(storefrontTags(row.id, await slugOf(row.categoryId)));
  return { id: row.id };
});

const update = adminAction(productEditInput, async (input, { session }) => {
  const db = getDb();
  const before = await products.getById(db, input.id);
  const row = await products.update(db, input, { actorId: session.user.id });
  revalidatePath(`/suits/${row.id}`);
  await revalidateStorefront(
    storefrontTags(row.id, before?.category.slug ?? null, await slugOf(row.categoryId)),
  );
  return { id: row.id, slug: row.slug };
});

// A 'use server' file exports async functions only.
export async function createProduct(raw: unknown) {
  return create(raw);
}

export async function updateProduct(raw: unknown) {
  return update(raw);
}
