import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Catalog } from './catalog';
import { estimateCredits } from './estimate';
import { fakeMp4, mp4Seconds } from './mp4';
import { checkStock } from './stock';

let stock: string;

const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#556677' } })
    .jpeg()
    .toBuffer();

beforeEach(async () => {
  stock = mkdtempSync(join(tmpdir(), 'stock-'));
  mkdirSync(join(stock, 'Dhanak'));
  writeFileSync(join(stock, 'Dhanak', 'a.jpeg'), await jpeg(100, 200));
  writeFileSync(join(stock, 'Dhanak', 'a-VID.mp4'), fakeMp4(9.5));
  writeFileSync(join(stock, 'Dhanak', 'left-out.mp4'), fakeMp4(10));
  writeFileSync(join(stock, 'Dhanak', 'stray.jpeg'), await jpeg(10, 10));
  writeFileSync(join(stock, 'Dhanak', 'details.md'), '# notes');
});

afterEach(() => rmSync(stock, { recursive: true, force: true }));

type Media = {
  file: string;
  alt: string;
  crop?: { x: number; y: number; width: number; height: number };
};

const catalog = (photos: Media[], videos: Media[] = []): Catalog =>
  ({
    collections: [{ collection: 'dhanak', prefix: 'DHN', leftOut: ['Dhanak/left-out.mp4'] }],
    suits: [{ design_id: 'DHN-01', photos, videos }],
    problems: [],
  }) as unknown as Catalog;

describe('mp4Seconds', () => {
  it('reads the length from the header, and null for anything else', () => {
    expect(mp4Seconds(fakeMp4(9.5, 64))).toBe(9.5);
    expect(mp4Seconds(Buffer.from('not a video at all'))).toBeNull();
    expect(mp4Seconds(Buffer.alloc(0))).toBeNull();
  });
});

describe('checkStock', () => {
  it('measures each listed file and reports the stray one, not the left-out one or .md', async () => {
    const report = await checkStock(
      stock,
      catalog(
        [{ file: 'Dhanak/a.jpeg', alt: 'A suit', crop: { x: 0, y: 10, width: 100, height: 150 } }],
        [{ file: 'Dhanak/a-VID.mp4', alt: 'A video' }],
      ),
    );
    expect(report.problems).toEqual([]);
    expect(report.unlisted).toEqual(['Dhanak/stray.jpeg']);
    expect(report.items).toMatchObject([
      { designId: 'DHN-01', kind: 'image', file: 'Dhanak/a.jpeg', width: 100, height: 200 },
      { designId: 'DHN-01', kind: 'video', file: 'Dhanak/a-VID.mp4', seconds: 9.5 },
    ]);
  });

  it('reports a missing file, a crop outside the photo and a video over 60 s', async () => {
    writeFileSync(join(stock, 'Dhanak', 'long.mp4'), fakeMp4(61));
    const report = await checkStock(
      stock,
      catalog(
        [
          { file: 'Dhanak/a.jpeg', alt: 'A suit', crop: { x: 50, y: 0, width: 60, height: 10 } },
          { file: 'Dhanak/gone.jpeg', alt: 'A suit' },
        ],
        [{ file: 'Dhanak/long.mp4', alt: 'A video' }],
      ),
    );
    expect(report.problems).toEqual([
      'DHN-01: the crop on Dhanak/a.jpeg goes outside the 100×200 photo',
      'DHN-01: Dhanak/gone.jpeg is missing from Business data/Stock',
      'DHN-01: Dhanak/long.mp4 is 61.0 s; the limit is 60 s',
    ]);
  });

  it('reports a file that is not a JPEG, PNG or WebP, or not an image at all', async () => {
    writeFileSync(
      join(stock, 'Dhanak', 'b.jpeg'),
      await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } })
        .gif()
        .toBuffer(),
    );
    writeFileSync(join(stock, 'Dhanak', 'c.jpeg'), 'text');
    const report = await checkStock(
      stock,
      catalog([
        { file: 'Dhanak/b.jpeg', alt: 'A suit' },
        { file: 'Dhanak/c.jpeg', alt: 'A suit' },
      ]),
    );
    expect(report.problems).toEqual([
      'DHN-01: Dhanak/b.jpeg is gif, not JPEG, PNG or WebP',
      "DHN-01: Dhanak/c.jpeg can't be read as an image",
    ]);
  });

  it('changes nothing in the stock folder', async () => {
    const before = readdirSync(join(stock, 'Dhanak')).map((f) => [
      f,
      statSync(join(stock, 'Dhanak', f)).mtimeMs,
    ]);
    await checkStock(
      stock,
      catalog([
        { file: 'Dhanak/a.jpeg', alt: 'A suit', crop: { x: 0, y: 0, width: 10, height: 10 } },
      ]),
    );
    const after = readdirSync(join(stock, 'Dhanak')).map((f) => [
      f,
      statSync(join(stock, 'Dhanak', f)).mtimeMs,
    ]);
    expect(after).toEqual(before);
  });
});

describe('estimateCredits', () => {
  it('counts uploads, HD video seconds rounded up, and storage', () => {
    const estimate = estimateCredits([
      { kind: 'image', bytes: 1024 ** 3 / 2, seconds: null },
      { kind: 'video', bytes: 0, seconds: 9.2 },
      { kind: 'video', bytes: 0, seconds: null },
    ]);
    expect(estimate).toEqual({
      uploads: 3,
      videoSeconds: 70,
      transformations: 3 + 70 * 4,
      storageGb: 0.5,
      credits: 0.78,
    });
  });

  it('is zero when nothing needs uploading', () => {
    expect(estimateCredits([]).credits).toBe(0);
  });
});
