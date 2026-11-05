// Throwaway draft suits for admin specs. Each spec deletes what it made (media rows go with the
// suit), so parallel workers never touch each other's suits.
import { randomUUID } from 'node:crypto';

import type { Database } from '@mustafa/db/client';
import { category, product } from '@mustafa/db/schema';
import { asc, eq, inArray } from 'drizzle-orm';

export type DraftSuit = { id: string; name: string; slug: string; designCode: string };

export async function createDraftSuit(
  db: Database,
  overrides: Partial<typeof product.$inferInsert> = {},
): Promise<DraftSuit> {
  const tag = randomUUID().slice(0, 8);
  const [collection] = await db
    .select({ id: category.id })
    .from(category)
    .orderBy(asc(category.sortOrder))
    .limit(1);
  if (!collection) throw new Error('E2E needs a seeded collection (pnpm db:seed)');
  const [row] = await db
    .insert(product)
    .values({
      name: `E2E Black Embroidered Dhanak 3-Piece Suit ${tag}`,
      slug: `e2e-suit-${tag}`,
      designCode: `E2E-${tag}`.toUpperCase(),
      categoryId: collection.id,
      pieces: 'three_piece',
      pieceDetails: [{ piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' }],
      dressCategories: ['Unstitched Suits'],
      fabric: 'Dhanak',
      design: ['Embroidered'],
      season: 'winter',
      ...overrides,
    })
    .returning();
  return { id: row!.id, name: row!.name, slug: row!.slug, designCode: row!.designCode ?? '' };
}

export async function deleteSuits(db: Database, ids: string[]) {
  if (ids.length > 0) await db.delete(product).where(inArray(product.id, ids));
}

export const suitById = async (db: Database, id: string) =>
  (await db.select().from(product).where(eq(product.id, id)))[0] ?? null;
