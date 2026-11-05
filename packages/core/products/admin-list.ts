// The admin's suit list (docs/prd.md A2): every suit not deleted, with search and filters.
// Archived suits show only under their own filter, so the everyday list stays short.
import type { Database } from '@mustafa/db/client';
import { category, product, productMedia } from '@mustafa/db/schema';
import type { AdminProductListInput } from '@mustafa/validators/product';
import { and, count, desc, eq, isNull, ne, type SQL, sql } from 'drizzle-orm';

import { searchMatchers } from '../search/index';

export const ADMIN_PAGE_SIZE = 24;

// The owner's open `check:` items (docs/catalog.md), kept on the suit as attributes.checks.
export const openChecksSql =
  sql<number>`case when jsonb_typeof(${product.attributes} -> 'checks') = 'array'
  then jsonb_array_length(${product.attributes} -> 'checks') else 0 end`.mapWith(Number);

export type AdminListItem = {
  id: string;
  name: string;
  designCode: string | null;
  status: 'draft' | 'published' | 'archived';
  price: number | null;
  collection: string;
  mainImage: string | null;
  openChecks: number;
  updatedAt: Date;
};

export async function adminList(db: Database, input: AdminProductListInput) {
  const match = input.q ? searchMatchers(input.q) : null;
  const conditions: (SQL | undefined)[] = [
    isNull(product.deletedAt),
    input.status ? eq(product.status, input.status) : ne(product.status, 'archived'),
    input.collection ? eq(product.categoryId, input.collection) : undefined,
    input.needsPrice ? isNull(product.price) : undefined,
    match?.where,
  ];
  const where = and(...conditions);

  const mainImage = sql<string | null>`(select ${productMedia.publicId} from ${productMedia}
    where ${productMedia.productId} = ${product.id} and ${productMedia.isPrimary} limit 1)`;

  const [items, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        designCode: product.designCode,
        status: product.status,
        price: product.price,
        collection: category.name,
        mainImage,
        openChecks: openChecksSql,
        updatedAt: product.updatedAt,
      })
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id))
      .where(where)
      .orderBy(...(match ? match.order : [desc(product.updatedAt), desc(product.id)]))
      .limit(ADMIN_PAGE_SIZE)
      .offset((input.page - 1) * ADMIN_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id))
      .where(where),
  ]);

  return {
    items: items as AdminListItem[],
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}
