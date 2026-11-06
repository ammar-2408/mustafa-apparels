'use server';
import 'server-only';

import * as categories from '@mustafa/core/categories';
import * as products from '@mustafa/core/products';
import { getDb } from '@mustafa/db/client';
import {
  productCheckInput,
  productCreateInput,
  productEditInput,
  productIdInput,
  productPublishInput,
} from '@mustafa/validators/product';
import { suitTags } from '@mustafa/validators/revalidate';
import { revalidatePath } from 'next/cache';

import { adminAction } from '../../../lib/action';
import { revalidateStorefront } from '../../../lib/revalidate';

const slugOf = async (categoryId: string) =>
  (await categories.getById(getDb(), categoryId))?.slug ?? null;

// Lists show the suit's card, its page shows the rest, and its collection pages list it.
const storefrontTags = suitTags;

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

// After a status change: the admin pages and every storefront page that lists or shows the suit.
async function refreshSuit(id: string, categoryId: string) {
  revalidatePath(`/suits/${id}`);
  revalidatePath('/suits');
  await revalidateStorefront(storefrontTags(id, await slugOf(categoryId)));
}

// Publishing runs every publish check (price, colour, main photo, alt text, no brand names, no
// open check: items) and reports them all at once, keyed by field.
const publish = adminAction(productPublishInput, async (input, { session }) => {
  const row = await products.setStatus(getDb(), input, { actorId: session.user.id });
  await refreshSuit(row.id, row.categoryId);
  return { id: row.id, status: row.status };
});

const archive = adminAction(productIdInput, async ({ id }, { session }) => {
  const row = await products.archive(getDb(), id, { actorId: session.user.id });
  await refreshSuit(row.id, row.categoryId);
  return { id: row.id, status: row.status };
});

// Back as a draft, to be checked and published again.
const restore = adminAction(productIdInput, async ({ id }, { session }) => {
  const row = await products.restore(getDb(), id, { actorId: session.user.id });
  await refreshSuit(row.id, row.categoryId);
  return { id: row.id, status: row.status };
});

// A draft copy with no codes or photos; nothing public changes.
const duplicate = adminAction(productIdInput, async ({ id }, { session }) => {
  const row = await products.duplicate(getDb(), id, { actorId: session.user.id });
  revalidatePath('/suits');
  return { id: row.id };
});

const clearCheck = adminAction(productCheckInput, async (input, { session }) => {
  const row = await products.clearCheck(getDb(), input, { actorId: session.user.id });
  revalidatePath(`/suits/${row.id}`);
  return { id: row.id, remaining: products.openChecks(row.attributes).length };
});

// A 'use server' file exports async functions only.
export async function createProduct(raw: unknown) {
  return create(raw);
}

export async function updateProduct(raw: unknown) {
  return update(raw);
}

export async function setProductStatus(raw: unknown) {
  return publish(raw);
}

export async function archiveProduct(raw: unknown) {
  return archive(raw);
}

export async function restoreProduct(raw: unknown) {
  return restore(raw);
}

export async function duplicateProduct(raw: unknown) {
  return duplicate(raw);
}

export async function clearProductCheck(raw: unknown) {
  return clearCheck(raw);
}
