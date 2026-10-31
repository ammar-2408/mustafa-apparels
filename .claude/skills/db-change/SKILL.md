---
name: db-change
description: Safe workflow for database schema changes with Drizzle and Neon — edit schema, generate and review the migration, test on a branch, keep changes backward compatible, update docs/database.md. Use for any new table, column, index, constraint, enum or data migration.
allowed-tools: Bash(pnpm db:generate *) Bash(pnpm db:migrate *) Bash(pnpm test *)
---

# Database change

Reference: `docs/database.md`.

## Steps
1. **Design** — write the change in 2–3 lines: tables/columns, types, nullability, defaults, indexes, FK `onDelete` behaviour. Money = integer PKR. Timestamps = `timestamptz`.
2. **Test first** — integration test in `packages/core/**/*.int.test.ts` (or `packages/db/**`) that uses the new structure; run it → fails.
3. **Schema** — edit `packages/db/schema/*.ts`. Add indexes for every FK and for new filter/sort columns.
4. **Generate** — `pnpm db:generate`. **Read the generated SQL**: no unexpected drops/renames (drizzle may interpret a rename as drop + add — fix by writing the rename manually), correct defaults, `create extension` where needed.
5. **Apply** to the dev branch — `pnpm db:migrate`. Then `pnpm test`.
6. **Docs** — update `docs/database.md` (table + index sections, ER diagram if relations changed).
7. **Ship** — `ship-change` (commit schema + migration + tests + docs together).

## Backward-compatible changes (production has live data)
| Want | Do it in releases |
|---|---|
| Add required column | 1) add nullable/with default → 2) backfill → 3) set NOT NULL |
| Rename column | 1) add new → 2) write both, read new → 3) backfill → 4) drop old (later release) |
| Drop column/table | 1) stop using it in code → 2) drop in a later release (owner approval) |
| Change type | add new column + backfill, never in-place on big tables |

## Never
- Edit a migration that's already committed/applied (a hook blocks this) — create a new one.
- `drizzle-kit push` against production (denied in settings).
- Run destructive SQL via the `neon` MCP on the production branch.
- Store secrets or plain passwords in any table.
