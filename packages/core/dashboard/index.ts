// The admin dashboard's figures (docs/prd.md A1). One aggregate query per table.
import type { Database } from '@mustafa/db/client';
import { category, inquiry, product, user } from '@mustafa/db/schema';
import { count, isNull, sql } from 'drizzle-orm';

export type DashboardCounts = {
  published: number;
  drafts: number;
  // Unpriced suits that aren't archived: what the owner must price before publishing.
  needsPrice: number;
  archived: number;
  newInquiries: number;
  customers: number;
  collections: number;
  hiddenCollections: number;
};

const countWhere = (condition: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

export async function counts(db: Database): Promise<DashboardCounts> {
  const [suits, inquiries, customers, collections] = await Promise.all([
    db
      .select({
        published: countWhere(sql`${product.status} = 'published'`),
        drafts: countWhere(sql`${product.status} = 'draft'`),
        needsPrice: countWhere(sql`${product.price} is null and ${product.status} <> 'archived'`),
        archived: countWhere(sql`${product.status} = 'archived'`),
      })
      .from(product)
      .where(isNull(product.deletedAt)),
    db.select({ newInquiries: countWhere(sql`${inquiry.status} = 'new'`) }).from(inquiry),
    db
      .select({ customers: count() })
      .from(user)
      .where(sql`${user.role} = 'customer'`),
    db
      .select({
        collections: countWhere(sql`${category.isActive}`),
        hiddenCollections: countWhere(sql`not ${category.isActive}`),
      })
      .from(category),
  ]);
  return { ...suits[0]!, ...inquiries[0]!, ...customers[0]!, ...collections[0]! };
}
