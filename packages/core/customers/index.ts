// The admin's customer list (docs/prd.md A6): read-only. Ban and role changes come later, with a
// session wipe and the new-admin 2FA rules (docs/project-implementation.md, Phase 9).
import type { Database } from '@mustafa/db/client';
import { inquiry, user } from '@mustafa/db/schema';
import type { CustomerListInput } from '@mustafa/validators/search';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';

export const CUSTOMER_PAGE_SIZE = 50;

// % and _ in a search are literal characters, not wildcards.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function list(db: Database, { q, page }: CustomerListInput) {
  const pattern = q ? `%${escapeLike(q)}%` : null;
  const where = and(
    eq(user.role, 'customer'),
    pattern ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined,
  );
  const [items, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        banned: user.banned,
        createdAt: user.createdAt,
        inquiries: count(inquiry.id),
      })
      .from(user)
      .leftJoin(inquiry, eq(inquiry.userId, user.id))
      .where(where)
      .groupBy(user.id)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(CUSTOMER_PAGE_SIZE)
      .offset((page - 1) * CUSTOMER_PAGE_SIZE),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)) };
}
