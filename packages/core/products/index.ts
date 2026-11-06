// Suits (the `product` table). Inputs are already parsed by packages/validators.
// Status changes go only through setStatus, so publishing always meets the publish rules.
import type { Database } from '@mustafa/db/client';
import { category, product, productMedia } from '@mustafa/db/schema';
import type { MediaInput } from '@mustafa/validators/media';
import {
  type ProductInput,
  type ProductListInput,
  productRuleErrors,
  type ProductUpdateInput,
} from '@mustafa/validators/product';
import { PRICE_BANDS, priceBandOf } from '@mustafa/validators/taxonomy';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  ne,
  notInArray,
  type SQL,
  sql,
} from 'drizzle-orm';

import { type Actor, diff, record, snapshot } from '../audit';
import {
  CoreError,
  type FieldErrors,
  invalid,
  isForeignKeyViolation,
  notFound,
  violatedConstraint,
} from '../errors';
import { claimSlug, moveSlug, redirectTarget } from '../redirects';
import { filterConditions } from './filters';
import { openChecks, publishErrors } from './publish';

export { openChecks };

export const PAGE_SIZE = 24;

export type Product = typeof product.$inferSelect;

// A photo or video with the metadata the server read from Cloudinary (docs/api.md §5.2).
export type MediaRecord = MediaInput & {
  width: number;
  height: number;
  bytes: number;
  format: string;
  durationSeconds: number | null;
};

type Scope = { scope?: 'public' | 'admin' };

// Public pages show published, undeleted suits in visible collections.
export const isPublic = and(
  eq(product.status, 'published'),
  isNull(product.deletedAt),
  eq(category.isActive, true),
);

const ORDER: Record<ProductListInput['sort'], SQL[]> = {
  newest: [sql`${product.publishedAt} desc nulls last`, desc(product.createdAt), desc(product.id)],
  price_asc: [sql`${product.price} asc nulls last`, desc(product.id)],
  price_desc: [sql`${product.price} desc nulls last`, desc(product.id)],
};

// What a product card needs.
export const cardColumns = {
  id: product.id,
  name: product.name,
  slug: product.slug,
  designCode: product.designCode,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  pieces: product.pieces,
  pieceDetails: product.pieceDetails,
  collectionType: product.collectionType,
  fabric: product.fabric,
  mainColor: product.mainColor,
  colorFamily: product.colorFamily,
  availability: product.availability,
  status: product.status,
  featured: product.featured,
  publishedAt: product.publishedAt,
  category: { slug: category.slug, name: category.name },
  imageUrl: productMedia.url,
  imageAlt: productMedia.alt,
  imageWidth: productMedia.width,
  imageHeight: productMedia.height,
};

type CardRow = {
  imageUrl: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
};

export const toCard = <T extends CardRow>({
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  ...rest
}: T) => ({
  ...rest,
  image:
    imageUrl === null
      ? null
      : { url: imageUrl, alt: imageAlt!, width: imageWidth!, height: imageHeight! },
});

const uniqueValues = <T>(values: T[]) => [...new Set(values)];

// Filter values that published suits in scope actually have, so the UI hides empty options.
async function facetsFor(db: Database, where: SQL | undefined) {
  const rows = await db
    .select({
      pieces: product.pieces,
      dressCategories: product.dressCategories,
      fabric: product.fabric,
      design: product.design,
      season: product.season,
      outfitStyle: product.outfitStyle,
      colorFamily: product.colorFamily,
      price: product.price,
    })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .where(where);
  const present = <T>(values: (T | null)[]) =>
    uniqueValues(values.filter((v): v is T => v !== null));
  const bands = new Set(rows.map((r) => priceBandOf(r.price)?.id));
  return {
    pieces: present(rows.map((r) => r.pieces)),
    dressCategories: present(rows.flatMap((r) => r.dressCategories)),
    fabric: present(rows.map((r) => r.fabric)),
    design: present(rows.flatMap((r) => r.design)),
    season: present(rows.map((r) => r.season)),
    outfitStyle: present(rows.map((r) => r.outfitStyle)),
    colorFamily: present(rows.map((r) => r.colorFamily)),
    priceBands: PRICE_BANDS.map((band) => band.id).filter((id) => bands.has(id)),
  };
}

export async function list(
  db: Database,
  input: ProductListInput,
  { scope = 'public' }: Scope = {},
) {
  const inScope = scope === 'public' ? isPublic : isNull(product.deletedAt);
  let inCategory: SQL | undefined;
  if (input.categorySlug !== undefined) {
    const [found] = await db
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.slug, input.categorySlug),
          scope === 'public' ? eq(category.isActive, true) : undefined,
        ),
      );
    if (!found) throw notFound('Collection');
    inCategory = eq(product.categoryId, found.id);
  }
  const where = and(inScope, inCategory, filterConditions(input.filters));

  const [rows, [{ total } = { total: 0 }], facets] = await Promise.all([
    db
      .select(cardColumns)
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id))
      .leftJoin(
        productMedia,
        and(eq(productMedia.productId, product.id), eq(productMedia.isPrimary, true)),
      )
      .where(where)
      .orderBy(...ORDER[input.sort])
      .limit(PAGE_SIZE)
      .offset((input.page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id))
      .where(where),
    facetsFor(db, and(isPublic, inCategory)),
  ]);

  return {
    items: rows.map(toCard),
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    facets,
  };
}

async function withDetails(db: Database, where: SQL | undefined) {
  const [row] = await db
    .select({ product, category: { slug: category.slug, name: category.name } })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .where(where);
  if (!row) return null;
  const media = await db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, row.product.id))
    .orderBy(asc(productMedia.sortOrder), asc(productMedia.id));
  return { ...row.product, category: row.category, media };
}

export const getBySlug = (db: Database, slug: string) =>
  withDetails(db, and(eq(product.slug, slug), isPublic));

// Admin view: any status, but not deleted.
export const getById = (db: Database, id: string) =>
  withDetails(db, and(eq(product.id, id), isNull(product.deletedAt)));

// The current slug an old suit slug should permanently redirect to, if that suit is public.
export async function resolveRedirect(db: Database, oldSlug: string) {
  const targetId = await redirectTarget(db, 'product', oldSlug);
  if (!targetId) return null;
  const [row] = await db
    .select({ slug: product.slug })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .where(and(eq(product.id, targetId), isPublic));
  return row?.slug ?? null;
}

const CONFLICTS: Record<string, [field: string, message: string]> = {
  product_slug_unique: ['slug', 'Another suit already uses this slug'],
  product_design_code_key: ['designCode', 'Another suit already uses this design code'],
  product_import_key_key: ['importKey', 'Another suit was imported with this design ID'],
};

// Turns database errors on writes into errors the admin form can show.
const asCoreError = (error: unknown) => {
  const conflict = CONFLICTS[violatedConstraint(error) ?? ''];
  if (conflict) {
    return new CoreError('CONFLICT', conflict[1], { [conflict[0]]: [conflict[1]] });
  }
  if (
    isForeignKeyViolation(error) &&
    violatedConstraint(error) === 'product_category_id_category_id_fk'
  ) {
    return invalid({ categoryId: ['Choose an existing collection'] });
  }
  return error;
};

const mediaRows = (productId: string, media: MediaRecord[]) =>
  media.map(({ durationSeconds, ...m }) => ({
    ...m,
    productId,
    durationSeconds: durationSeconds === null ? null : String(durationSeconds),
  }));

type CreateInput = ProductInput & { importKey?: string | null; media?: MediaRecord[] };

export async function create(db: Database, { media = [], ...input }: CreateInput, actor: Actor) {
  if (input.status !== 'draft') throw invalid({ status: ['Save as a draft first, then publish'] });
  try {
    return await db.transaction(async (tx) => {
      await claimSlug(tx, 'product', input.slug);
      const [row] = await tx.insert(product).values(input).returning();
      if (media.length > 0) await tx.insert(productMedia).values(mediaRows(row!.id, media));
      await record(tx, actor, {
        action: 'product.create',
        entity: 'product',
        entityId: row!.id,
        changes: { after: { ...snapshot(row!), media: media.map((m) => m.publicId) } },
      });
      return row!;
    });
  } catch (error) {
    throw asCoreError(error);
  }
}

async function lockLive(db: Database, id: string) {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), isNull(product.deletedAt)))
    .for('update');
  if (!row) throw notFound('Suit');
  return row;
}

export async function update(db: Database, { id, ...changes }: ProductUpdateInput, actor: Actor) {
  if (changes.status !== undefined) {
    throw invalid({ status: ['Use publish, unpublish or archive to change the status'] });
  }
  try {
    return await db.transaction(async (tx) => {
      const before = await lockLive(tx, id);
      const merged = { ...before, ...changes };
      const errors: FieldErrors = productRuleErrors(merged);
      if (Object.keys(errors).length > 0) throw invalid(errors);

      const { before: was, after: now } = diff(before, merged);
      if (Object.keys(now).length === 0) return before;
      if (changes.slug !== undefined && changes.slug !== before.slug) {
        await moveSlug(tx, 'product', id, before.slug, changes.slug);
      }
      const [row] = await tx.update(product).set(changes).where(eq(product.id, id)).returning();
      await record(tx, actor, {
        action: 'product.update',
        entity: 'product',
        entityId: id,
        changes: { before: was, after: now },
      });
      return row!;
    });
  } catch (error) {
    throw asCoreError(error);
  }
}

// The first free slug of base, base-2, base-3... within the 140-character limit.
async function freeSlug(db: Database, wanted: string) {
  const base = wanted.slice(0, 134).replace(/-+$/, '');
  const taken = new Set(
    (
      await db
        .select({ slug: product.slug })
        .from(product)
        .where(like(product.slug, `${base}%`))
    ).map((r) => r.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

// A draft copy with every field but the codes, media and publish date (docs/api.md §3).
export async function duplicate(db: Database, id: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const source = await lockLive(tx, id);
    // New id and timestamps; search_vector is generated.
    const fields = Object.fromEntries(
      Object.entries(source).filter(
        ([key]) => !['id', 'searchVector', 'createdAt', 'updatedAt'].includes(key),
      ),
    ) as Omit<Product, 'id' | 'searchVector' | 'createdAt' | 'updatedAt'>;
    const slug = await freeSlug(tx, `${source.slug}-copy`);
    await claimSlug(tx, 'product', slug);
    const [row] = await tx
      .insert(product)
      .values({
        ...fields,
        name: `${source.name} (copy)`.slice(0, 120),
        slug,
        designCode: null,
        importKey: null,
        status: 'draft',
        featured: false,
        publishedAt: null,
        deletedAt: null,
      })
      .returning();
    await record(tx, actor, {
      action: 'product.duplicate',
      entity: 'product',
      entityId: row!.id,
      changes: { after: { from: id, slug } },
    });
    return row!;
  });
}

type Status = Product['status'];

const ACTIONS: Record<Status, Partial<Record<Status, string>>> = {
  draft: { published: 'product.publish', archived: 'product.archive' },
  published: { draft: 'product.unpublish', archived: 'product.archive' },
  archived: { draft: 'product.restore' },
};

// The only way a suit's status changes (docs/api.md §3 setProductStatus). Publishing checks
// every rule in publish.ts; an archived suit is restored to a draft before it can be published.
export async function setStatus(
  db: Database,
  { id, status }: { id: string; status: Status },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const before = await lockLive(tx, id);
    if (before.status === status) return before;
    const action = ACTIONS[before.status][status];
    if (!action) throw invalid({ status: ['Restore the suit, then publish it'] });

    const changes: Partial<Product> = { status };
    if (status === 'published') {
      const media = await tx
        .select({
          kind: productMedia.kind,
          alt: productMedia.alt,
          isPrimary: productMedia.isPrimary,
        })
        .from(productMedia)
        .where(eq(productMedia.productId, id));
      const errors = publishErrors(before, media);
      if (Object.keys(errors).length > 0) throw invalid(errors);
      changes.publishedAt = before.publishedAt ?? new Date();
    }
    const [row] = await tx.update(product).set(changes).where(eq(product.id, id)).returning();
    await record(tx, actor, {
      action,
      entity: 'product',
      entityId: id,
      changes: { before: { status: before.status }, after: { status } },
    });
    return row!;
  });
}

// Marks one check: item as done: it leaves the list, and the audit log keeps its text.
export async function clearCheck(
  db: Database,
  { id, check }: { id: string; check: string },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const before = await lockLive(tx, id);
    const checks = openChecks(before.attributes);
    if (!checks.includes(check)) throw notFound('Check');
    const remaining = checks.filter((item) => item !== check);
    const [row] = await tx
      .update(product)
      .set({ attributes: { ...before.attributes, checks: remaining } })
      .where(eq(product.id, id))
      .returning();
    await record(tx, actor, {
      action: 'product.check.clear',
      entity: 'product',
      entityId: id,
      changes: { before: { check }, after: { remaining: remaining.length } },
    });
    return row!;
  });
}

export const archive = (db: Database, id: string, actor: Actor) =>
  setStatus(db, { id, status: 'archived' }, actor);

// A restored suit comes back as a draft, to be checked and published again.
export const restore = (db: Database, id: string, actor: Actor) =>
  setStatus(db, { id, status: 'draft' }, actor);

/** One suit as a grid card shows it: card fields plus its main photo. */
export type Card = Awaited<ReturnType<typeof list>>['items'][number];

/** Cards for one suit's other colours ("Also in this design"): published suits only, in order. */
export async function alsoInDesign(db: Database, designCodes: string[], exceptId?: string) {
  const codes = [...new Set(designCodes.map((code) => code.trim().toUpperCase()))].filter(Boolean);
  if (codes.length === 0) return [];
  const rows = await db
    .select(cardColumns)
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .leftJoin(
      productMedia,
      and(eq(productMedia.productId, product.id), eq(productMedia.isPrimary, true)),
    )
    .where(
      and(
        isPublic,
        inArray(sql`upper(${product.designCode})`, codes),
        exceptId ? ne(product.id, exceptId) : undefined,
      ),
    );
  const order = new Map(codes.map((code, i) => [code, i]));
  return rows
    .map(toCard)
    .sort(
      (a, b) =>
        (order.get(a.designCode?.toUpperCase() ?? '') ?? 0) -
        (order.get(b.designCode?.toUpperCase() ?? '') ?? 0),
    );
}

/** More suits from the same collection, newest first, leaving out the suit itself and some ids. */
export async function related(
  db: Database,
  { id, categoryId }: { id: string; categoryId: string },
  { limit = 4, exclude = [] as string[] } = {},
) {
  const rows = await db
    .select(cardColumns)
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .leftJoin(
      productMedia,
      and(eq(productMedia.productId, product.id), eq(productMedia.isPrimary, true)),
    )
    .where(
      and(isPublic, eq(product.categoryId, categoryId), notInArray(product.id, [id, ...exclude])),
    )
    .orderBy(...ORDER.newest)
    .limit(limit);
  return rows.map(toCard);
}
