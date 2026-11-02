// Test data (docs/testing-qa.md §4). Each call makes a unique, valid row; pass overrides
// for what a test cares about. Values come from the filter list in docs/catalog.md §4.
import type { Database } from '@mustafa/db/client';
import { category, product, productMedia, user } from '@mustafa/db/schema';

let seq = 0;
const next = () => String(++seq).padStart(3, '0');

type CategoryInsert = typeof category.$inferInsert;
type ProductInsert = typeof product.$inferInsert;
type MediaInsert = typeof productMedia.$inferInsert;
type UserInsert = typeof user.$inferInsert;

export async function makeCategory(db: Database, overrides: Partial<CategoryInsert> = {}) {
  const n = next();
  const [row] = await db
    .insert(category)
    .values({ name: `Collection ${n}`, slug: `collection-${n}`, ...overrides })
    .returning();
  return row!;
}

export async function makeUser(db: Database, overrides: Partial<UserInsert> = {}) {
  const n = next();
  const [row] = await db
    .insert(user)
    .values({ name: `Customer ${n}`, email: `customer${n}@example.com`, ...overrides })
    .returning();
  return row!;
}

export async function makeMedia(
  db: Database,
  overrides: Partial<MediaInsert> & Pick<MediaInsert, 'productId'>,
) {
  const n = next();
  const kind = overrides.kind ?? 'image';
  const [row] = await db
    .insert(productMedia)
    .values({
      kind,
      url: `https://res.cloudinary.com/test/${kind}/upload/products/test/m${n}`,
      publicId: `products/test/m${n}`,
      alt: 'Model wearing a black 3-piece Dhanak suit with an embroidered neckline',
      width: 1200,
      height: 2000,
      bytes: 300_000,
      format: kind === 'image' ? 'jpg' : 'mp4',
      durationSeconds: kind === 'video' ? '20' : null,
      ...overrides,
    })
    .returning();
  return row!;
}

type MakeProduct = Partial<ProductInsert> & {
  // Fills everything the publish rules need, including a main photo with alt text.
  published?: boolean;
};

export async function makeProduct(
  db: Database,
  { published = false, ...overrides }: MakeProduct = {},
) {
  const n = next();
  const categoryId = overrides.categoryId ?? (await makeCategory(db)).id;
  const ready: Partial<ProductInsert> = published
    ? {
        status: 'published',
        price: 4500,
        mainColor: 'Black',
        colorFamily: 'Black',
        publishedAt: new Date(),
      }
    : {};
  const [row] = await db
    .insert(product)
    .values({
      name: `Black Embroidered Dhanak 3-Piece Suit ${n}`,
      slug: `black-embroidered-dhanak-3-piece-tst-${n}`,
      designCode: `TST-${n}`,
      categoryId,
      pieces: 'three_piece',
      pieceDetails: [
        { piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered' },
        { piece: 'dupatta', fabric: 'Dhanak', finish: 'Printed' },
        { piece: 'trouser', finish: 'Plain dyed' },
      ],
      collectionType: 'Premium',
      dressCategories: ['Unstitched Suits'],
      fabric: 'Dhanak',
      design: ['Embroidered'],
      season: 'winter',
      ...ready,
      ...overrides,
    })
    .returning();
  if (published) await makeMedia(db, { productId: row!.id, isPrimary: true });
  return row!;
}
