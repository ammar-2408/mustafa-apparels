import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { auditLog, category, user } from './schema';
import { createTestDb, resetTestDb, type TestDb } from './testing';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

describe('resetTestDb', () => {
  it('empties every table, including the insert-only audit log, and keeps the schema', async () => {
    const [admin] = await db
      .insert(user)
      .values({ name: 'Admin', email: 'admin@example.com', role: 'admin' })
      .returning();
    await db.insert(category).values({ name: 'Dhanak', slug: 'dhanak' });
    await db.insert(auditLog).values({ actorId: admin!.id, action: 'x', entity: 'category' });

    await resetTestDb(db);

    for (const table of [user, category, auditLog]) {
      expect(await db.select().from(table)).toEqual([]);
    }
    const { rows } = await db.execute<{ applied: number }>(
      sql`select count(*)::int as applied from drizzle.__drizzle_migrations`,
    );
    expect(rows[0]!.applied).toBeGreaterThan(0);
    await db.insert(category).values({ name: 'Dhanak', slug: 'dhanak' });
  });
});
