// Old slugs of suits and collections (docs/database.md §2 slug_redirect). A redirect stores the
// target's id, not its slug, so a chain of renames always resolves in one hop.
import type { Database } from '@mustafa/db/client';
import { slugRedirect } from '@mustafa/db/schema';
import { and, eq } from 'drizzle-orm';

type Entity = 'product' | 'category';

// Call inside the transaction that changes the slug.
export async function moveSlug(
  db: Database,
  entity: Entity,
  targetId: string,
  oldSlug: string,
  newSlug: string,
) {
  await db
    .insert(slugRedirect)
    .values({ entity, oldSlug, targetId })
    .onConflictDoUpdate({ target: [slugRedirect.entity, slugRedirect.oldSlug], set: { targetId } });
  await claimSlug(db, entity, newSlug);
}

// A live page always wins over a redirect from the same slug.
export async function claimSlug(db: Database, entity: Entity, slug: string) {
  await db
    .delete(slugRedirect)
    .where(and(eq(slugRedirect.entity, entity), eq(slugRedirect.oldSlug, slug)));
}

export async function redirectTarget(db: Database, entity: Entity, oldSlug: string) {
  const [row] = await db
    .select({ targetId: slugRedirect.targetId })
    .from(slugRedirect)
    .where(and(eq(slugRedirect.entity, entity), eq(slugRedirect.oldSlug, oldSlug)));
  return row?.targetId ?? null;
}
