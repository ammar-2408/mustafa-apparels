// Collections (the `category` table). Inputs are already parsed by packages/validators.
import type { Database } from '@mustafa/db/client';
import { category } from '@mustafa/db/schema';
import type { CategoryInput, CategoryUpdateInput } from '@mustafa/validators/category';
import { and, asc, eq } from 'drizzle-orm';

import { type Actor, diff, record, snapshot } from '../audit';
import { CoreError, invalid, isForeignKeyViolation, isUniqueViolation, notFound } from '../errors';
import { claimSlug, moveSlug, redirectTarget } from '../redirects';

export type Category = typeof category.$inferSelect;

type Visibility = { includeHidden?: boolean };

const visible = ({ includeHidden = false }: Visibility) =>
  includeHidden ? undefined : eq(category.isActive, true);

export async function list(db: Database, options: Visibility = {}) {
  return db
    .select()
    .from(category)
    .where(visible(options))
    .orderBy(asc(category.sortOrder), asc(category.name));
}

export async function getBySlug(db: Database, slug: string, options: Visibility = {}) {
  const [row] = await db
    .select()
    .from(category)
    .where(and(eq(category.slug, slug), visible(options)));
  return row ?? null;
}

export async function getById(db: Database, id: string) {
  const [row] = await db.select().from(category).where(eq(category.id, id));
  return row ?? null;
}

// The current slug an old collection slug should permanently redirect to, if still visible.
export async function resolveRedirect(db: Database, oldSlug: string) {
  const targetId = await redirectTarget(db, 'category', oldSlug);
  const target = targetId ? await getById(db, targetId) : null;
  return target?.isActive ? target.slug : null;
}

// Turns database errors on writes into errors the admin form can show.
const asCoreError = (error: unknown) => {
  if (isUniqueViolation(error)) {
    return new CoreError('CONFLICT', 'That slug is already used', {
      slug: ['Another collection already uses this slug'],
    });
  }
  if (isForeignKeyViolation(error)) return invalid({ parentId: ['Choose an existing collection'] });
  return error;
};

export async function create(db: Database, input: CategoryInput, actor: Actor) {
  try {
    return await db.transaction(async (tx) => {
      await claimSlug(tx, 'category', input.slug);
      const [row] = await tx.insert(category).values(input).returning();
      await record(tx, actor, {
        action: 'category.create',
        entity: 'category',
        entityId: row!.id,
        changes: { after: snapshot(row!) },
      });
      return row!;
    });
  } catch (error) {
    throw asCoreError(error);
  }
}

// Walks up from the new parent; reaching the collection itself would make a loop.
async function assertNotOwnAncestor(db: Database, id: string, parentId: string | null) {
  for (let current = parentId; current;) {
    if (current === id) {
      throw invalid({ parentId: ['A collection can’t be inside one of its own sub-collections'] });
    }
    current = (await getById(db, current))?.parentId ?? null;
  }
}

export async function update(db: Database, { id, ...changes }: CategoryUpdateInput, actor: Actor) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(category).where(eq(category.id, id)).for('update');
      if (!before) throw notFound('Collection');
      if (changes.parentId !== undefined) await assertNotOwnAncestor(tx, id, changes.parentId);

      const { before: was, after: now } = diff(before, { ...before, ...changes });
      if (Object.keys(now).length === 0) return before;

      if (changes.slug !== undefined && changes.slug !== before.slug) {
        await moveSlug(tx, 'category', id, before.slug, changes.slug);
      }
      const [row] = await tx.update(category).set(changes).where(eq(category.id, id)).returning();
      await record(tx, actor, {
        action: 'category.update',
        entity: 'category',
        entityId: id,
        changes: { before: was, after: now },
      });
      return row!;
    });
  } catch (error) {
    throw asCoreError(error);
  }
}

// `ids` must be every collection, in the new order.
export async function reorder(db: Database, { ids }: { ids: string[] }, actor: Actor) {
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: category.id }).from(category);
    const known = new Set(existing.map((row) => row.id));
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw invalid({ ids: ['The list must include every collection once'] });
    }
    for (const [sortOrder, id] of ids.entries()) {
      await tx.update(category).set({ sortOrder }).where(eq(category.id, id));
    }
    await record(tx, actor, {
      action: 'category.reorder',
      entity: 'category',
      entityId: null,
      changes: { after: { ids } },
    });
  });
}
