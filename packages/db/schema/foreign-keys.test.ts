import { getTableName, is, type SQL } from 'drizzle-orm';
import { getTableConfig, PgDialect, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as schema from './index';

const tables = Object.values(schema as Record<string, unknown>).filter((value): value is PgTable =>
  is(value, PgTable),
);

// Every foreign key as "table.column -> target.column (on delete)".
const foreignKeys = tables.flatMap((table) =>
  getTableConfig(table).foreignKeys.map((fk) => {
    const { columns, foreignColumns, foreignTable } = fk.reference();
    return `${getTableName(table)}.${columns[0]!.name} -> ${getTableName(foreignTable)}.${foreignColumns[0]!.name} (${fk.onDelete})`;
  }),
);

describe('foreign keys', () => {
  it('match the delete rules in docs/database.md', () => {
    expect(foreignKeys.sort()).toEqual([
      'account.user_id -> user.id (cascade)',
      'audit_log.actor_id -> user.id (set null)',
      'category.parent_id -> category.id (set null)',
      'inquiry.product_id -> product.id (set null)',
      'inquiry.user_id -> user.id (set null)',
      'product.category_id -> category.id (restrict)',
      'product_media.product_id -> product.id (cascade)',
      'session.user_id -> user.id (cascade)',
      'site_setting.updated_by -> user.id (set null)',
      'two_factor.user_id -> user.id (cascade)',
      'wishlist_item.product_id -> product.id (cascade)',
      'wishlist_item.user_id -> user.id (cascade)',
    ]);
  });
});

describe('product search vector', () => {
  it('wraps arrays in immutable_array_to_string, never the volatile array_to_string', () => {
    const expression = (schema.product.searchVector.generated!.as as () => SQL)();
    const { sql } = new PgDialect().sqlToQuery(expression);
    expect(sql).toContain('immutable_array_to_string("product"."motifs"');
    expect(sql).not.toMatch(/(?<!immutable_)array_to_string/);
  });
});
