import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../testing';
import { category } from './category';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

describe('category table', () => {
  it('fills id, order, visibility and timestamps by default', async () => {
    const [row] = await db.insert(category).values({ name: 'Dhanak', slug: 'dhanak' }).returning();
    expect(row).toMatchObject({ sortOrder: 0, isActive: true, parentId: null, description: null });
    expect(row!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a second collection with the same slug', async () => {
    await db.insert(category).values({ name: 'Khaddar', slug: 'khaddar' });
    await expect(
      db.insert(category).values({ name: 'Khaddar 2', slug: 'khaddar' }),
    ).rejects.toThrow();
  });

  it('keeps a sub-collection when its parent is deleted, as a top-level one', async () => {
    const [parent] = await db
      .insert(category)
      .values({ name: 'Winter', slug: 'winter' })
      .returning();
    const [child] = await db
      .insert(category)
      .values({ name: 'Winter Dhanak', slug: 'winter-dhanak', parentId: parent!.id })
      .returning();
    await db.delete(category).where(eq(category.id, parent!.id));
    const [after] = await db.select().from(category).where(eq(category.id, child!.id));
    expect(after!.parentId).toBeNull();
  });

  it('rejects a parent that does not exist', async () => {
    await expect(
      db.insert(category).values({ name: 'Orphan', slug: 'orphan', parentId: 'missing' }),
    ).rejects.toThrow();
  });
});
