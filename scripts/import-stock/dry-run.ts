// `pnpm import:stock --dry-run` (docs/catalog.md §6, steps 1 and 2): validate catalog/, check the
// listed files in Business data/Stock, and print what an import would upload and roughly what it
// would cost in Cloudinary credits. Writes nothing anywhere.
import { type Catalog, loadCatalog } from './catalog';
import { estimateCredits } from './estimate';
import { checkStock, type StockReport } from './stock';

export type DryRun = {
  ok: boolean;
  lines: string[];
  catalog: Catalog;
  stock: StockReport;
};

const pad = (text: string | number, width: number) => String(text).padEnd(width);

export async function dryRun({
  catalogDir,
  stockDir,
}: {
  catalogDir: string;
  stockDir: string;
}): Promise<DryRun> {
  const catalog = loadCatalog(catalogDir);
  const stock = await checkStock(stockDir, catalog);
  const lines: string[] = [];

  lines.push('Suit     Photos  Videos  Crop  Checks  Name');
  for (const suit of catalog.suits) {
    lines.push(
      [
        pad(suit.design_id, 8),
        pad(suit.photos.length, 7),
        pad(suit.videos.length, 7),
        pad(suit.photos.some((p) => p.crop) ? 'yes' : '', 5),
        pad(suit.check.length, 7),
        suit.name,
      ].join(' '),
    );
  }

  const estimate = estimateCredits(stock.items);
  const photos = stock.items.filter((i) => i.kind === 'image').length;
  lines.push(
    '',
    `${catalog.suits.length} suits in ${catalog.collections.length} collections: ${photos} photos, ${stock.items.length - photos} videos (${estimate.videoSeconds} s).`,
    `Cloudinary, if every file is uploaded: ${estimate.uploads} uploads + ${estimate.videoSeconds * 4} for the 720 px videos = ${estimate.transformations} transformations, ${(estimate.storageGb * 1024).toFixed(0)} MB stored: about ${estimate.credits} credits of 25 a month. Files already in Cloudinary are reused at no cost.`,
  );

  const left = catalog.collections.flatMap((c) => c.leftOut);
  if (left.length > 0) lines.push(`Left out on purpose (_collection.md): ${left.join(', ')}`);
  if (stock.unlisted.length > 0) {
    lines.push(`Not in any suit or Left out list: ${stock.unlisted.join(', ')}`);
  }

  const problems = [...catalog.problems, ...stock.problems];
  if (problems.length > 0) {
    lines.push(
      '',
      `${problems.length} problem(s) to fix before importing:`,
      ...problems.map((p) => `  - ${p}`),
    );
  } else {
    lines.push('', 'No problems. Nothing was written.');
  }
  return { ok: problems.length === 0, lines, catalog, stock };
}
