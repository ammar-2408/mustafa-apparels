// `pnpm db:seed` (docs/database.md §6). Safe to run on every environment, any number of times:
// - collections only when there are none, so the owner's renames and deletions stick;
// - each known setting only when its key is missing, so the owner's edits stick;
// - `--e2e` adds 12 demo suits for tests, never on preview or production.
// Real stock comes from catalog/ through scripts/import-stock.ts, never from here.
// The first admin is added at step 3.2, once Better Auth's tables exist.
import { count, inArray } from 'drizzle-orm';

import type { Database } from './client';
import { category, product, productMedia, siteSetting, slugRedirect } from './schema';

const COLLECTIONS = [
  { name: 'Dhanak', slug: 'dhanak', sortOrder: 0 },
  { name: 'Khaddar', slug: 'khaddar', sortOrder: 1 },
  { name: 'Lajwanti', slug: 'lajwanti', sortOrder: 2 },
];

// The owner's real details, already in their stored form (E.164, lower case).
const SETTINGS: Record<string, string> = {
  shop_name: 'Mustafa Apparels',
  whatsapp: '+923482799707',
  phone: '+923069558717',
  service_area: 'Pakistan',
  email: 'ammarofficial321@gmail.com',
};

type Collection = 'dhanak' | 'khaddar' | 'lajwanti';
type Demo = [
  code: string,
  collection: Collection,
  color: string,
  family: string,
  finish: 'Embroidered' | 'Printed',
  price: number | null,
  status: 'published' | 'draft' | 'archived',
];

// Every collection, both piece counts, every price band and a range of colours.
const DEMO_SUITS: Demo[] = [
  ['E2E-01', 'dhanak', 'Black', 'Black', 'Embroidered', 3500, 'published'],
  ['E2E-02', 'dhanak', 'Mustard', 'Yellow', 'Embroidered', 4500, 'published'],
  ['E2E-03', 'dhanak', 'Rust', 'Orange', 'Printed', 5500, 'published'],
  ['E2E-04', 'dhanak', 'Teal', 'Teal', 'Embroidered', 6500, 'published'],
  ['E2E-05', 'dhanak', 'Rose pink', 'Pink', 'Printed', 7500, 'published'],
  ['E2E-06', 'khaddar', 'Maroon', 'Maroon', 'Embroidered', 8500, 'published'],
  ['E2E-07', 'khaddar', 'Sage green', 'Green', 'Printed', 9500, 'published'],
  ['E2E-08', 'khaddar', 'Charcoal', 'Grey', 'Embroidered', 12000, 'published'],
  ['E2E-09', 'khaddar', 'Beige', 'Beige', 'Printed', 3800, 'published'],
  ['E2E-10', 'lajwanti', 'Navy', 'Blue', 'Printed', 4200, 'published'],
  ['E2E-11', 'lajwanti', 'Purple', 'Purple', 'Printed', null, 'draft'],
  ['E2E-12', 'lajwanti', 'Brick red', 'Red', 'Printed', 6800, 'archived'],
];

const VIDEO_SUIT = 'E2E-02';
const REDIRECTED_SUIT = 'E2E-03';

export type SeedOptions = {
  appEnv: string | undefined;
  e2e?: boolean;
  // Cloudinary cloud for the demo media URLs.
  cloudName?: string;
};

export type SeedSummary = { categories: number; settings: number; demoSuits: number };

export async function seed(db: Database, options: SeedOptions): Promise<SeedSummary> {
  const { appEnv, e2e = false, cloudName = 'demo' } = options;
  if (e2e && (appEnv === 'preview' || appEnv === 'production')) {
    throw new Error(`--e2e adds demo suits and never runs on ${appEnv}`);
  }
  return db.transaction(async (tx) => {
    const summary: SeedSummary = { categories: 0, settings: 0, demoSuits: 0 };

    const [{ existing } = { existing: 0 }] = await tx.select({ existing: count() }).from(category);
    if (existing === 0) {
      summary.categories = (await tx.insert(category).values(COLLECTIONS).returning()).length;
    }

    const inserted = await tx
      .insert(siteSetting)
      .values(Object.entries(SETTINGS).map(([key, value]) => ({ key, value })))
      .onConflictDoNothing({ target: siteSetting.key })
      .returning();
    summary.settings = inserted.length;

    if (e2e) summary.demoSuits = await seedDemoSuits(tx, cloudName);
    return summary;
  });
}

async function seedDemoSuits(db: Database, cloudName: string) {
  const present = new Set(
    (
      await db
        .select({ code: product.designCode })
        .from(product)
        .where(
          inArray(
            product.designCode,
            DEMO_SUITS.map(([code]) => code),
          ),
        )
    ).map((row) => row.code),
  );
  const collections = new Map(
    (await db.select({ id: category.id, slug: category.slug }).from(category)).map((c) => [
      c.slug,
      c.id,
    ]),
  );

  let added = 0;
  for (const [
    index,
    [code, collection, color, family, finish, price, status],
  ] of DEMO_SUITS.entries()) {
    if (present.has(code)) continue;
    const categoryId = collections.get(collection);
    if (!categoryId) throw new Error(`Seed needs the "${collection}" collection for ${code}`);

    const twoPiece = collection === 'lajwanti';
    const fabric = collection === 'khaddar' ? 'Khaddar' : 'Dhanak';
    const pieces = twoPiece ? 2 : 3;
    const name = `${color} ${finish} ${fabric} ${pieces}-Piece Suit`;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${code.toLowerCase()}`;
    const n = code.slice(-2);

    const [suit] = await db
      .insert(product)
      .values({
        name,
        slug,
        designCode: code,
        description: `Demo suit for automated tests: a ${color.toLowerCase()} unstitched ${pieces}-piece ${fabric} suit.`,
        price,
        categoryId,
        pieces: twoPiece ? 'two_piece' : 'three_piece',
        pieceDetails: twoPiece
          ? [
              { piece: 'shirt', fabric, finish: 'Printed' },
              { piece: 'trouser', fabric, finish: 'Printed' },
            ]
          : [
              { piece: 'shirt', fabric, finish },
              { piece: 'dupatta', fabric, finish: 'Printed' },
              { piece: 'trouser', finish: 'Plain dyed' },
            ],
        collectionType: 'Premium',
        dressCategories: ['Unstitched Suits'],
        fabric,
        design: finish === 'Embroidered' ? ['Embroidered'] : ['All-Over Print', 'Floral Print'],
        season: 'winter',
        mainColor: color,
        colorFamily: family,
        status,
        publishedAt: status === 'draft' ? null : new Date(Date.UTC(2026, 9, 1 + index)),
      })
      .returning();

    const media: (typeof productMedia.$inferInsert)[] = [
      {
        productId: suit!.id,
        kind: 'image',
        url: `https://res.cloudinary.com/${cloudName}/image/upload/products/e2e/demo-${n}.jpg`,
        publicId: `products/e2e/demo-${n}`,
        alt: `Demo photo of a ${color.toLowerCase()} ${fabric} suit`,
        width: 1200,
        height: 1600,
        bytes: 200_000,
        format: 'jpg',
        isPrimary: true,
      },
    ];
    if (code === VIDEO_SUIT) {
      media.push({
        ...media[0]!,
        kind: 'video',
        url: `https://res.cloudinary.com/${cloudName}/video/upload/products/e2e/demo-${n}-video.mp4`,
        publicId: `products/e2e/demo-${n}-video`,
        alt: `Demo video of a ${color.toLowerCase()} ${fabric} suit`,
        format: 'mp4',
        isPrimary: false,
      });
    }
    await db.insert(productMedia).values(
      media.map((m, sortOrder) => ({
        ...m,
        sortOrder,
        durationSeconds: m.format === 'mp4' ? '20' : null,
      })),
    );

    if (code === REDIRECTED_SUIT) {
      await db
        .insert(slugRedirect)
        .values({ entity: 'product', oldSlug: `${slug}-old`, targetId: suit!.id });
    }
    added += 1;
  }
  return added;
}
