// The real import (docs/catalog.md §6, steps 3 and 4). For each suit in catalog/:
//   - each photo (cropped in memory) and video gets a fixed id from its bytes and crop;
//   - a file this suit already has is skipped, one Cloudinary already has is reused, and only
//     the rest are uploaded, so re-runs and the later production import cost nothing;
//   - a new suit is created as a draft with no price; an existing one is updated field by field,
//     only where the owner hasn't changed the value since the last import (attributes.import).
// Price, status and availability are never written. A check the owner cleared never returns.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

import { type Actor, record } from '@mustafa/core/audit';
import {
  type AssetInfo,
  assetProblems,
  assetUrl,
  IMPORTED_PREFIX,
  type MediaConfig,
} from '@mustafa/core/integrations/media';
import * as media from '@mustafa/core/media';
import * as products from '@mustafa/core/products';
import type { Database } from '@mustafa/db/client';
import { category, product, productMedia, user } from '@mustafa/db/schema';
import { toProductInput } from '@mustafa/validators/catalog';
import { productInput, type ProductUpdateInput } from '@mustafa/validators/product';
import { and, asc, eq, isNull } from 'drizzle-orm';
import sharp from 'sharp';

import type { CatalogSuit } from './catalog';
import { estimateCredits } from './estimate';
import { mp4Seconds } from './mp4';
import type { Uploader } from './uploader';

// Fields the import owns (compared with the last import before each update).
const FIELDS = [
  'name',
  'slug',
  'designCode',
  'description',
  'categoryId',
  'pieces',
  'pieceDetails',
  'collectionType',
  'dressCategories',
  'fabric',
  'design',
  'season',
  'outfitStyle',
  'mainColor',
  'colorFamily',
  'accentColors',
  'motifs',
  'relatedDesignCodes',
] as const;
type Field = (typeof FIELDS)[number];

type ImportedMedia = { publicId: string; alt: string };
// What the last import wrote, kept on the suit as attributes.import.
type Snapshot = {
  fields: Partial<Record<Field, unknown>>;
  media: Record<string, ImportedMedia>;
  checks: string[];
};

export type PlannedMedia = {
  key: string;
  kind: 'image' | 'video';
  file: string;
  alt: string;
  publicId: string;
  bytes: Buffer;
  fileName: string;
  seconds: number | null;
};

export type SuitResult = {
  designId: string;
  outcome: 'created' | 'updated' | 'unchanged' | 'skipped';
  changed: string[];
  keptEdits: string[];
  uploaded: number;
  reused: number;
  openChecks: string[];
  notes: string[];
};

export type ImportReport = {
  suits: SuitResult[];
  uploaded: number;
  reused: number;
  unused: string[];
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const hash8 = (...parts: (Buffer | string)[]) => {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest('hex').slice(0, 8);
};

// The bytes to upload and their fixed id. The id comes from the original file and the crop, not
// the cropped output, so a new sharp version can't change ids and force a re-upload.
export async function planMedia(suit: CatalogSuit, stockDir: string): Promise<PlannedMedia[]> {
  const planned: PlannedMedia[] = [];
  const add = async (
    kind: 'image' | 'video',
    file: string,
    alt: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => {
    const original = readFileSync(join(stockDir, file));
    const stem = basename(file, extname(file)).replace(/[^\w.-]/g, '-');
    const publicId = `${IMPORTED_PREFIX}${suit.design_id}/${stem}-${hash8(original, JSON.stringify(crop ?? null))}`;
    let bytes = original;
    let fileName = basename(file);
    if (crop) {
      const image = sharp(original).extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      });
      const isPng = extname(file).toLowerCase() === '.png';
      bytes = isPng ? await image.png().toBuffer() : await image.jpeg({ quality: 90 }).toBuffer();
      fileName = `${stem}${isPng ? '.png' : '.jpg'}`;
    }
    planned.push({
      key: `${kind}:${file}`,
      kind,
      file,
      alt,
      publicId,
      bytes,
      fileName,
      seconds: kind === 'video' ? mp4Seconds(bytes) : null,
    });
  };
  for (const photo of suit.photos) await add('image', photo.file, photo.alt, photo.crop);
  for (const video of suit.videos) await add('video', video.file, video.alt);
  return planned;
}

// Who the import's changes are recorded as: the seeded owner, else the first admin.
export async function importActor(db: Database, email?: string): Promise<Actor> {
  const admins = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.role, 'admin'))
    .orderBy(asc(user.createdAt));
  const owner = admins.find((a) => email && a.email.toLowerCase() === email.toLowerCase());
  const actor = owner ?? admins[0];
  if (!actor) throw new Error('No admin account in this database. Run pnpm db:seed first.');
  return { actorId: actor.id };
}

type Options = {
  db: Database;
  suits: CatalogSuit[];
  stockDir: string;
  uploader: Uploader;
  mediaConfig: MediaConfig;
  actor: Actor;
  maxCredits: number;
  log?: (line: string) => void;
};

export async function importStock({
  db,
  suits,
  stockDir,
  uploader,
  mediaConfig,
  actor,
  maxCredits,
  log = () => {},
}: Options): Promise<ImportReport> {
  const categories = new Map(
    (await db.select({ id: category.id, slug: category.slug }).from(category)).map((c) => [
      c.slug,
      c.id,
    ]),
  );
  for (const suit of suits) {
    if (!categories.has(suit.collection)) {
      throw new Error(
        `${suit.design_id}: no "${suit.collection}" collection in this database. Add it in admin or run pnpm db:seed.`,
      );
    }
  }

  // Pass 1: what needs uploading, before anything is written.
  const plans = new Map<string, PlannedMedia[]>();
  const existing = new Map<string, AssetInfo>();
  const toUpload: PlannedMedia[] = [];
  const known = new Set(
    (await db.select({ publicId: productMedia.publicId }).from(productMedia)).map(
      (r) => r.publicId,
    ),
  );
  for (const suit of suits) {
    const planned = await planMedia(suit, stockDir);
    plans.set(suit.design_id, planned);
    for (const item of planned) {
      if (known.has(item.publicId)) continue;
      const found = await uploader.find(item.publicId, item.kind);
      if (found) existing.set(item.publicId, found);
      else toUpload.push(item);
    }
  }
  const estimate = estimateCredits(
    toUpload.map((m) => ({ kind: m.kind, bytes: m.bytes.length, seconds: m.seconds })),
  );
  log(`To upload: ${estimate.uploads} files, about ${estimate.credits} Cloudinary credits.`);
  if (estimate.credits > maxCredits) {
    throw new Error(
      `This import would use about ${estimate.credits} Cloudinary credits, over the --max-credits limit of ${maxCredits}. Nothing was uploaded.`,
    );
  }

  // Pass 2: suit by suit.
  const report: ImportReport = { suits: [], uploaded: 0, reused: 0, unused: [] };
  for (const suit of suits) {
    const result = await importSuit({
      db,
      suit,
      planned: plans.get(suit.design_id)!,
      categoryId: categories.get(suit.collection)!,
      existing,
      uploader,
      mediaConfig,
      actor,
      unused: report.unused,
    });
    report.suits.push(result);
    report.uploaded += result.uploaded;
    report.reused += result.reused;
    log(
      `${suit.design_id}: ${result.outcome}${result.changed.length ? ` (${result.changed.join(', ')})` : ''}`,
    );
  }
  return report;
}

async function importSuit({
  db,
  suit,
  planned,
  categoryId,
  existing,
  uploader,
  mediaConfig,
  actor,
  unused,
}: {
  db: Database;
  suit: CatalogSuit;
  planned: PlannedMedia[];
  categoryId: string;
  existing: Map<string, AssetInfo>;
  uploader: Uploader;
  mediaConfig: MediaConfig;
  actor: Actor;
  unused: string[];
}): Promise<SuitResult> {
  const result: SuitResult = {
    designId: suit.design_id,
    outcome: 'unchanged',
    changed: [],
    keptEdits: [],
    uploaded: 0,
    reused: 0,
    openChecks: [],
    notes: suit.notes,
  };
  const desired = productInput.parse(toProductInput(suit, categoryId));
  const [current] = await db.select().from(product).where(eq(product.importKey, suit.design_id));
  if (current?.deletedAt) {
    result.outcome = 'skipped';
    result.notes = [...result.notes, 'Deleted in admin, so not imported again'];
    return result;
  }

  // The stored asset for each planned file: already on this suit, already in Cloudinary, or new.
  const prefix = `${IMPORTED_PREFIX}${suit.design_id}/`;
  const stored = async (item: PlannedMedia) => {
    let asset = existing.get(item.publicId);
    if (asset) result.reused += 1;
    else {
      asset = await uploader.upload(item.publicId, item.kind, item.bytes, item.fileName);
      result.uploaded += 1;
    }
    // The same limits as an admin upload. No age limit: imported files are reused for years.
    const problems = assetProblems(asset, { kind: item.kind, prefix, now: asset.createdAt });
    if (problems.length > 0)
      throw new Error(`${suit.design_id}: ${item.file}: ${problems.join(' ')}`);
    return {
      publicId: asset.publicId,
      url: assetUrl(mediaConfig, asset),
      format: asset.format,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.durationSeconds,
    };
  };

  const fieldsOf = (input: typeof desired) =>
    Object.fromEntries(FIELDS.map((field) => [field, input[field]])) as Snapshot['fields'];
  const mediaSnapshot = Object.fromEntries(
    planned.map((m) => [m.key, { publicId: m.publicId, alt: m.alt }]),
  );

  if (!current) {
    const records: products.MediaRecord[] = [];
    let mainSet = false;
    for (const [sortOrder, item] of planned.entries()) {
      const asset = await stored(item);
      const isPrimary = item.kind === 'image' && !mainSet;
      if (isPrimary) mainSet = true;
      records.push({
        ...asset,
        kind: item.kind,
        alt: item.alt,
        posterPublicId: null,
        sortOrder,
        isPrimary,
      });
    }
    const snapshot: Snapshot = {
      fields: fieldsOf(desired),
      media: mediaSnapshot,
      checks: suit.check,
    };
    const created = await products.create(
      db,
      {
        ...desired,
        importKey: suit.design_id,
        attributes: { checks: suit.check, import: snapshot },
        media: records,
      },
      actor,
    );
    await record(db, actor, {
      action: 'product.import',
      entity: 'product',
      entityId: created.id,
      changes: {
        source: 'import',
        designCode: suit.design_id,
        uploaded: result.uploaded,
        reused: result.reused,
      },
    });
    result.outcome = 'created';
    result.openChecks = suit.check;
    return result;
  }

  // An existing suit: change a field only if the owner hasn't changed it since the last import.
  const attributes = (current.attributes ?? {}) as Record<string, unknown>;
  const last = (attributes.import ?? { fields: {}, media: {}, checks: [] }) as Snapshot;
  const changes: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const now = current[field];
    const want = desired[field];
    if (same(now, want)) continue;
    if (field in last.fields && !same(now, last.fields[field])) result.keptEdits.push(field);
    else changes[field] = want;
  }
  const currentChecks = Array.isArray(attributes.checks) ? (attributes.checks as string[]) : [];
  const newChecks = suit.check.filter(
    (c) => !last.checks.includes(c) && !currentChecks.includes(c),
  );
  const checks = [...currentChecks, ...newChecks];
  const snapshot: Snapshot = {
    fields: fieldsOf(desired),
    media: mediaSnapshot,
    checks: suit.check,
  };
  if (!same(attributes.import, snapshot) || newChecks.length > 0) {
    changes.attributes = { ...attributes, checks, import: snapshot };
  }
  result.changed = Object.keys(changes).filter((k) => k !== 'attributes');
  if (newChecks.length > 0) result.changed.push('checks');
  if (Object.keys(changes).length > 0) {
    await products.update(db, { id: current.id, ...changes } as ProductUpdateInput, actor);
  }

  // Media: add new files, swap a changed file into the old one's place, update untouched alt text.
  const rows = await db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, current.id))
    .orderBy(asc(productMedia.sortOrder));
  let mediaChanged = false;
  for (const item of planned) {
    const before = last.media[item.key];
    const row = rows.find((r) => r.publicId === item.publicId);
    if (row) {
      if (row.alt !== item.alt && (!before || row.alt === before.alt)) {
        await media.updateAlt(db, { mediaId: row.id, alt: item.alt }, actor);
        mediaChanged = true;
      } else if (row.alt !== item.alt) result.keptEdits.push(`alt text of ${item.file}`);
      continue;
    }
    const old = before && rows.find((r) => r.publicId === before.publicId);
    // Imported before but no longer on the suit: the owner removed it in admin. Their edit wins,
    // even when catalog/ now has a new version of it (they can upload that in admin).
    if (before && !old) {
      result.keptEdits.push(`removed ${item.file}`);
      continue;
    }
    const added = await media.add(
      db,
      {
        productId: current.id,
        kind: item.kind,
        alt: old && old.alt !== before.alt ? old.alt : item.alt,
        asset: await stored(item),
      },
      actor,
    );
    mediaChanged = true;
    if (old) {
      // Same place in the order, and main if the old one was.
      const order = (
        await db
          .select()
          .from(productMedia)
          .where(eq(productMedia.productId, current.id))
          .orderBy(asc(productMedia.sortOrder))
      )
        .map((r) => r.id)
        .filter((id) => id !== added.id);
      order.splice(order.indexOf(old.id), 1, added.id);
      await media.reorder(db, { productId: current.id, mediaIds: [...order, old.id] }, actor);
      await media.remove(db, { mediaId: old.id }, actor);
      unused.push(old.publicId);
    }
  }
  for (const [key, was] of Object.entries(last.media)) {
    if (!(key in mediaSnapshot) && rows.some((r) => r.publicId === was.publicId)) {
      result.notes = [
        ...result.notes,
        `${key.split(':')[1]} is no longer in catalog/; remove it in admin if it should go`,
      ];
    }
  }
  if (mediaChanged) result.changed.push('media');
  if (result.changed.length > 0) {
    result.outcome = 'updated';
    await record(db, actor, {
      action: 'product.import',
      entity: 'product',
      entityId: current.id,
      changes: {
        source: 'import',
        designCode: suit.design_id,
        changed: result.changed,
        keptEdits: result.keptEdits,
        uploaded: result.uploaded,
        reused: result.reused,
      },
    });
  }
  const [after] = await db
    .select({ attributes: product.attributes })
    .from(product)
    .where(and(eq(product.id, current.id), isNull(product.deletedAt)));
  result.openChecks = ((after?.attributes as Record<string, unknown>)?.checks as string[]) ?? [];
  return result;
}
