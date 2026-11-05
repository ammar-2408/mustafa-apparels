import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseArgs } from '../import-stock';
import { dryRun } from './dry-run';
import { COLLECTION, suitText } from './fixtures';
import { fakeMp4 } from './mp4';

let root: string;
let catalogDir: string;
let stockDir: string;

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'dry-run-'));
  catalogDir = join(root, 'catalog');
  stockDir = join(root, 'Stock');
  mkdirSync(join(catalogDir, 'dhanak'), { recursive: true });
  mkdirSync(join(stockDir, 'Dhanak'), { recursive: true });
  writeFileSync(join(catalogDir, 'dhanak', '_collection.md'), COLLECTION);
  writeFileSync(join(catalogDir, 'dhanak', 'dhn-01.md'), suitText('DHN-01'));
  const photo = await sharp({ create: { width: 30, height: 40, channels: 3, background: '#0a7' } })
    .jpeg()
    .toBuffer();
  writeFileSync(join(stockDir, 'Dhanak', 'dhn-01.jpeg'), photo);
  writeFileSync(join(stockDir, 'Dhanak', 'dhn-01.mp4'), fakeMp4(10));
  writeFileSync(join(stockDir, 'Dhanak', 'out.mp4'), fakeMp4(10));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('dryRun', () => {
  it('passes a good catalog and prints the suit table and the credit estimate', async () => {
    const report = await dryRun({ catalogDir, stockDir });
    expect(report.ok).toBe(true);
    const text = report.lines.join('\n');
    expect(text).toMatch(/DHN-01 +1 +1 +0 +Teal Embroidered/);
    expect(text).toContain('1 suits in 1 collections: 1 photos, 1 videos (10 s).');
    expect(text).toContain('2 uploads + 40 for the 720 px videos = 42 transformations');
    expect(text).toContain('Left out on purpose (_collection.md): Dhanak/out.mp4');
    expect(text).toContain('No problems. Nothing was written.');
  });

  it('fails on a missing file and lists a stray one', async () => {
    rmSync(join(stockDir, 'Dhanak', 'dhn-01.mp4'));
    writeFileSync(join(stockDir, 'Dhanak', 'extra.jpeg'), 'x');
    const report = await dryRun({ catalogDir, stockDir });
    expect(report.ok).toBe(false);
    const text = report.lines.join('\n');
    expect(text).toContain('Not in any suit or Left out list: Dhanak/extra.jpeg');
    expect(text).toContain('  - DHN-01: Dhanak/dhn-01.mp4 is missing from Business data/Stock');
  });

  it('fails on a catalog problem such as a price', async () => {
    writeFileSync(
      join(catalogDir, 'dhanak', 'dhn-01.md'),
      suitText('DHN-01').replace('price:\n', 'price: 4500\n'),
    );
    const report = await dryRun({ catalogDir, stockDir });
    expect(report.ok).toBe(false);
    expect(report.lines.join('\n')).toMatch(/catalog\/dhanak\/dhn-01\.md: price:/);
  });
});

describe('parseArgs', () => {
  it('reads the flags, and refuses an unknown one', () => {
    expect(parseArgs(['--', '--dry-run', '--stock-dir', 'x'])).toMatchObject({ dryRun: true });
    expect(parseArgs([]).stockDir).toMatch(/Business data[\\/]Stock$/);
    expect(() => parseArgs(['--force'])).toThrow('Unknown option --force');
  });
});
