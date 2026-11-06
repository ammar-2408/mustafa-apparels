// Inquiries: the storefront form creates them (step 6.8), the admin inbox works through them.
import type { Database } from '@mustafa/db/client';
import { inquiry, product } from '@mustafa/db/schema';
import type { InquiryListInput } from '@mustafa/validators/inquiry';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { type Actor, record } from '../audit';
import { notFound } from '../errors';

export const INQUIRY_PAGE_SIZE = 50;

export type InquiryStatus = 'new' | 'contacted' | 'closed';

// One tab of the inbox, newest first, with the suit each one asked about (if it still exists).
export async function list(db: Database, { status, page }: InquiryListInput) {
  const where = eq(inquiry.status, status);
  const [items, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: inquiry.id,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
        productId: inquiry.productId,
        productName: product.name,
        productCode: product.designCode,
      })
      .from(inquiry)
      .leftJoin(product, eq(inquiry.productId, product.id))
      .where(where)
      .orderBy(desc(inquiry.createdAt), desc(inquiry.id))
      .limit(INQUIRY_PAGE_SIZE)
      .offset((page - 1) * INQUIRY_PAGE_SIZE),
    db.select({ total: count() }).from(inquiry).where(where),
  ]);
  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / INQUIRY_PAGE_SIZE)),
  };
}

// How many in each tab.
export async function counts(db: Database): Promise<Record<InquiryStatus, number>> {
  const rows = await db
    .select({ status: inquiry.status, total: count() })
    .from(inquiry)
    .groupBy(inquiry.status);
  const result: Record<InquiryStatus, number> = { new: 0, contacted: 0, closed: 0 };
  for (const row of rows) result[row.status] = row.total;
  return result;
}

export async function setStatus(
  db: Database,
  { id, status }: { id: string; status: InquiryStatus },
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(inquiry).where(eq(inquiry.id, id)).for('update');
    if (!before) throw notFound('Inquiry');
    if (before.status === status) return before;
    const [row] = await tx.update(inquiry).set({ status }).where(eq(inquiry.id, id)).returning();
    // The audit log keeps the change, never the customer's contact details or message.
    await record(tx, actor, {
      action: 'inquiry.status',
      entity: 'inquiry',
      entityId: id,
      changes: { before: { status: before.status }, after: { status } },
    });
    return row!;
  });
}

export type NewInquiry = {
  productId?: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  ipHash?: string;
};

/**
 * Saves a shopper's question (docs/api.md submitInquiry). A suit that isn't published any more is
 * left off rather than refusing the question. Returns the new inquiry with the suit it names.
 */
export async function create(db: Database, input: NewInquiry) {
  let suit: { id: string; name: string; slug: string; designCode: string | null } | null = null;
  if (input.productId) {
    const [row] = await db
      .select({
        id: product.id,
        name: product.name,
        slug: product.slug,
        designCode: product.designCode,
      })
      .from(product)
      .where(
        and(
          eq(product.id, input.productId),
          eq(product.status, 'published'),
          isNull(product.deletedAt),
        ),
      );
    suit = row ?? null;
  }
  const [row] = await db
    .insert(inquiry)
    .values({
      productId: suit?.id ?? null,
      userId: input.userId ?? null,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message,
      ipHash: input.ipHash ?? null,
    })
    .returning({ id: inquiry.id });
  return { id: row!.id, suit };
}
