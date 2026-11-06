// A customer's own things (docs/prd.md W7–W9): saved suits, their questions, their profile, and
// deleting the account. Every function takes the user id from the session, never from input, so
// one customer can never read or change another's (IDOR tests in account.int.test.ts).
import type { Database } from '@mustafa/db/client';
import { category, inquiry, product, productMedia, user, wishlistItem } from '@mustafa/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { notFound } from '../errors';
import { cardColumns, isPublic, toCard } from '../products';

/** Saves a public suit, or removes it with `saved: false`. Saving twice is harmless. */
export async function setSaved(
  db: Database,
  userId: string,
  { productId, saved }: { productId: string; saved: boolean },
) {
  if (!saved) {
    await db
      .delete(wishlistItem)
      .where(and(eq(wishlistItem.userId, userId), eq(wishlistItem.productId, productId)));
    return { saved: false };
  }
  const [visible] = await db
    .select({ id: product.id })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .where(and(eq(product.id, productId), isPublic));
  if (!visible) throw notFound('Suit');
  await db.insert(wishlistItem).values({ userId, productId }).onConflictDoNothing();
  return { saved: true };
}

/** The customer's saved suits that are still public, newest saved first. */
export async function savedSuits(db: Database, userId: string) {
  const rows = await db
    .select(cardColumns)
    .from(wishlistItem)
    .innerJoin(product, eq(wishlistItem.productId, product.id))
    .innerJoin(category, eq(product.categoryId, category.id))
    .leftJoin(
      productMedia,
      and(eq(productMedia.productId, product.id), eq(productMedia.isPrimary, true)),
    )
    .where(and(eq(wishlistItem.userId, userId), isPublic))
    .orderBy(desc(wishlistItem.createdAt));
  return rows.map(toCard);
}

/** The customer's questions, newest first, with the suit each asked about when it is public. */
export async function myInquiries(db: Database, userId: string) {
  return db
    .select({
      id: inquiry.id,
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
      suitName: product.name,
      suitSlug: product.slug,
    })
    .from(inquiry)
    .leftJoin(product, and(eq(inquiry.productId, product.id), eq(product.status, 'published')))
    .where(eq(inquiry.userId, userId))
    .orderBy(desc(inquiry.createdAt));
}

/** Name and phone (E.164, or null to remove it). The email changes only through verification. */
export async function updateProfile(
  db: Database,
  userId: string,
  { name, phone }: { name: string; phone: string | null },
) {
  const [row] = await db
    .update(user)
    .set({ name, phone })
    .where(eq(user.id, userId))
    .returning({ id: user.id, name: user.name, phone: user.phone });
  if (!row) throw notFound('Account');
  return row;
}

/**
 * Deletes the account. Its questions stay for the shop's records, but with no name, email,
 * phone or link to the account; sessions, the sign-in and saved suits go with the user.
 */
export async function deleteAccount(db: Database, userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(inquiry)
      .set({ userId: null, name: 'Deleted account', email: null, phone: null, ipHash: null })
      .where(eq(inquiry.userId, userId));
    const deleted = await tx.delete(user).where(eq(user.id, userId)).returning({ id: user.id });
    if (deleted.length === 0) throw notFound('Account');
  });
}
