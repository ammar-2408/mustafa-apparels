// A suit's photos and videos (the `product_media` table). The caller has already read the asset
// back from Cloudinary (integrations/media.ts verifyAsset), so sizes come from there; this module
// keeps the rows in order. The main image is always the first photo in the order: reordering
// makes the first photo main, and making a photo main moves it to the front.
import type { Database } from '@mustafa/db/client';
import { product, productMedia } from '@mustafa/db/schema';
import { and, asc, eq, isNull, max, ne } from 'drizzle-orm';

import { type Actor, record } from '../audit';
import { CoreError, invalid, isUniqueViolation, notFound } from '../errors';

export type Media = typeof productMedia.$inferSelect;

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export type StoredAsset = {
  publicId: string;
  url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  durationSeconds: number | null;
};

const audit = (
  tx: Tx,
  actor: Actor,
  productId: string,
  action: string,
  changes: Record<string, unknown>,
) =>
  record(tx, actor, {
    action: `product.media.${action}`,
    entity: 'product',
    entityId: productId,
    changes,
  });

async function assertProduct(tx: Tx, productId: string) {
  const [row] = await tx
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, productId), isNull(product.deletedAt)));
  if (!row) throw notFound('Suit');
}

async function ordered(tx: Tx, productId: string) {
  return tx
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, productId))
    .orderBy(asc(productMedia.sortOrder), asc(productMedia.id));
}

async function findMedia(tx: Tx, mediaId: string) {
  const [row] = await tx.select().from(productMedia).where(eq(productMedia.id, mediaId));
  if (!row) throw notFound('Photo or video');
  return row;
}

// Writes the order given, and makes its first photo the main image.
async function applyOrder(tx: Tx, productId: string, rows: Media[]) {
  const main = rows.find((row) => row.kind === 'image')?.id ?? null;
  // Clear first: the one-main-image index would refuse a second main for a moment.
  await tx
    .update(productMedia)
    .set({ isPrimary: false })
    .where(and(eq(productMedia.productId, productId), eq(productMedia.isPrimary, true)));
  for (const [sortOrder, row] of rows.entries()) {
    await tx
      .update(productMedia)
      .set({ sortOrder, isPrimary: row.id === main })
      .where(eq(productMedia.id, row.id));
  }
  return main;
}

type AddInput = { productId: string; kind: 'image' | 'video'; alt: string; asset: StoredAsset };

export async function add(db: Database, { productId, kind, alt, asset }: AddInput, actor: Actor) {
  try {
    return await db.transaction(async (tx) => {
      await assertProduct(tx, productId);
      const [{ last } = { last: null }] = await tx
        .select({ last: max(productMedia.sortOrder) })
        .from(productMedia)
        .where(eq(productMedia.productId, productId));
      const [hasMain] = await tx
        .select({ id: productMedia.id })
        .from(productMedia)
        .where(and(eq(productMedia.productId, productId), eq(productMedia.isPrimary, true)));
      const [row] = await tx
        .insert(productMedia)
        .values({
          productId,
          kind,
          alt,
          url: asset.url,
          publicId: asset.publicId,
          format: asset.format,
          bytes: asset.bytes,
          width: asset.width,
          height: asset.height,
          durationSeconds: asset.durationSeconds === null ? null : String(asset.durationSeconds),
          sortOrder: last === null ? 0 : last + 1,
          // The first photo of a suit becomes its main image.
          isPrimary: kind === 'image' && !hasMain,
        })
        .returning();
      await audit(tx, actor, productId, 'add', {
        after: { mediaId: row!.id, kind, publicId: asset.publicId, alt },
      });
      return row!;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CoreError('CONFLICT', 'That file is already saved', {
        publicId: ['This upload is already on a suit'],
      });
    }
    throw error;
  }
}

// `mediaIds` must be every item of the suit, in the new order.
export async function reorder(
  db: Database,
  { productId, mediaIds }: { productId: string; mediaIds: string[] },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    await assertProduct(tx, productId);
    const rows = await ordered(tx, productId);
    const byId = new Map(rows.map((row) => [row.id, row]));
    if (mediaIds.length !== rows.length || !mediaIds.every((id) => byId.has(id))) {
      throw invalid({ mediaIds: ['The list must include every photo and video once'] });
    }
    const main = await applyOrder(
      tx,
      productId,
      mediaIds.map((id) => byId.get(id)!),
    );
    await audit(tx, actor, productId, 'reorder', {
      before: { mediaIds: rows.map((row) => row.id) },
      after: { mediaIds },
    });
    return { mainId: main };
  });
}

export async function setPrimary(
  db: Database,
  { productId, mediaId }: { productId: string; mediaId: string },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const row = await findMedia(tx, mediaId);
    if (row.productId !== productId) throw notFound('Photo or video');
    if (row.kind !== 'image') throw invalid({ mediaId: ['The main image must be a photo'] });
    const rows = await ordered(tx, productId);
    await applyOrder(tx, productId, [row, ...rows.filter((other) => other.id !== mediaId)]);
    await audit(tx, actor, productId, 'primary', { after: { mediaId } });
    return { mainId: mediaId };
  });
}

// Returns the poster it replaced, so the caller can delete that file from Cloudinary.
export async function setPoster(
  db: Database,
  { mediaId, posterPublicId }: { mediaId: string; posterPublicId: string | null },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const row = await findMedia(tx, mediaId);
    if (row.kind !== 'video') throw invalid({ mediaId: ['Only a video has a poster'] });
    await tx.update(productMedia).set({ posterPublicId }).where(eq(productMedia.id, mediaId));
    await audit(tx, actor, row.productId, 'poster', {
      before: { posterPublicId: row.posterPublicId },
      after: { posterPublicId },
    });
    return { productId: row.productId, previous: row.posterPublicId };
  });
}

export async function updateAlt(
  db: Database,
  { mediaId, alt }: { mediaId: string; alt: string },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const row = await findMedia(tx, mediaId);
    if (row.alt === alt) return row;
    const [updated] = await tx
      .update(productMedia)
      .set({ alt })
      .where(eq(productMedia.id, mediaId))
      .returning();
    await audit(tx, actor, row.productId, 'alt', { before: { alt: row.alt }, after: { alt } });
    return updated!;
  });
}

// Removes the row and returns it, so the caller deletes the file (and any poster) from
// Cloudinary. If it was the main image, the next photo takes over.
export async function remove(db: Database, { mediaId }: { mediaId: string }, actor: Actor) {
  return db.transaction(async (tx) => {
    const row = await findMedia(tx, mediaId);
    await tx.delete(productMedia).where(eq(productMedia.id, mediaId));
    const rest = await tx
      .select()
      .from(productMedia)
      .where(and(eq(productMedia.productId, row.productId), ne(productMedia.id, mediaId)))
      .orderBy(asc(productMedia.sortOrder), asc(productMedia.id));
    await applyOrder(tx, row.productId, rest);
    await audit(tx, actor, row.productId, 'remove', {
      before: { mediaId, kind: row.kind, publicId: row.publicId, alt: row.alt },
    });
    return row;
  });
}

export async function getById(db: Database, mediaId: string) {
  const [row] = await db.select().from(productMedia).where(eq(productMedia.id, mediaId));
  return row ?? null;
}
