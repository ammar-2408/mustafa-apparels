// Checks the files the catalog lists in "Business data/Stock" (docs/catalog.md §6 step 2): each
// exists, fits the upload limits, and a crop fits inside its photo. Also finds files no suit lists
// and _collection.md doesn't explain. Read-only: only stat, readdir and read are ever called here.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { MEDIA_LIMITS } from '@mustafa/validators/media';
import sharp from 'sharp';

import type { Catalog } from './catalog';
import { mp4Seconds } from './mp4';

export type StockItem = {
  designId: string;
  kind: 'image' | 'video';
  file: string;
  bytes: number;
  seconds: number | null;
  width?: number;
  height?: number;
};

export type StockReport = { items: StockItem[]; problems: string[]; unlisted: string[] };

const MB = 1024 * 1024;

async function inspect(
  stockDir: string,
  designId: string,
  kind: 'image' | 'video',
  file: string,
  crop: { x: number; y: number; width: number; height: number } | undefined,
  problems: string[],
): Promise<StockItem | null> {
  const path = join(stockDir, file);
  let bytes: number;
  try {
    const stat = statSync(path);
    if (!stat.isFile()) throw new Error('not a file');
    bytes = stat.size;
  } catch {
    problems.push(`${designId}: ${file} is missing from Business data/Stock`);
    return null;
  }
  const limit = MEDIA_LIMITS[kind];
  if (bytes > limit.maxBytes) {
    problems.push(
      `${designId}: ${file} is ${(bytes / MB).toFixed(1)} MB; the limit is ${limit.maxBytes / MB} MB`,
    );
  }
  if (kind === 'video') {
    const seconds = mp4Seconds(readFileSync(path));
    if (seconds === null) problems.push(`${designId}: can't read the length of ${file}`);
    else if (seconds > MEDIA_LIMITS.video.maxSeconds) {
      problems.push(
        `${designId}: ${file} is ${seconds.toFixed(1)} s; the limit is ${MEDIA_LIMITS.video.maxSeconds} s`,
      );
    }
    return { designId, kind, file, bytes, seconds };
  }
  try {
    const meta = await sharp(readFileSync(path)).metadata();
    const format = meta.format === 'jpeg' ? 'jpg' : meta.format;
    if (!(MEDIA_LIMITS.image.formats as readonly string[]).includes(format ?? '')) {
      problems.push(
        `${designId}: ${file} is ${meta.format ?? 'not an image'}, not JPEG, PNG or WebP`,
      );
    }
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (crop && (crop.x + crop.width > width || crop.y + crop.height > height)) {
      problems.push(`${designId}: the crop on ${file} goes outside the ${width}×${height} photo`);
    }
    return { designId, kind, file, bytes, seconds: null, width, height };
  } catch {
    problems.push(`${designId}: ${file} can't be read as an image`);
    return null;
  }
}

function listStock(stockDir: string): string[] {
  const found: string[] = [];
  for (const folder of readdirSync(stockDir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const entry of readdirSync(join(stockDir, folder.name), { withFileTypes: true })) {
      if (entry.isFile() && !entry.name.toLowerCase().endsWith('.md')) {
        found.push(`${folder.name}/${entry.name}`);
      }
    }
  }
  return found.sort();
}

export async function checkStock(stockDir: string, catalog: Catalog): Promise<StockReport> {
  const problems: string[] = [];
  const items: StockItem[] = [];
  for (const suit of catalog.suits) {
    for (const photo of suit.photos) {
      const item = await inspect(
        stockDir,
        suit.design_id,
        'image',
        photo.file,
        photo.crop,
        problems,
      );
      if (item) items.push(item);
    }
    for (const video of suit.videos) {
      const item = await inspect(
        stockDir,
        suit.design_id,
        'video',
        video.file,
        undefined,
        problems,
      );
      if (item) items.push(item);
    }
  }
  const listed = new Set([
    ...catalog.suits.flatMap((s) => [...s.photos, ...s.videos].map((m) => m.file)),
    ...catalog.collections.flatMap((c) => c.leftOut),
  ]);
  let unlisted: string[] = [];
  try {
    unlisted = listStock(stockDir).filter((file) => !listed.has(file));
  } catch {
    problems.push(`Can't read ${stockDir}`);
  }
  return { items, problems, unlisted };
}
