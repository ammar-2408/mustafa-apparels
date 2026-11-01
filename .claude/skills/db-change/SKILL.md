---
name: db-change
description: Safe workflow for database schema changes with Drizzle and Neon — edit schema, generate and review the migration, test on a branch, keep changes backward compatible, update docs/database.md. Use for any new table, column, index, constraint, enum or data migration.
allowed-tools: Bash(pnpm db:generate *) Bash(pnpm db:migrate *) Bash(pnpm test *)
---

# Database change

Reference: `docs/database.md`.

## Steps
1. **Design** — write the change in 2–3 lines: tables/columns, types, nullability, defaults, indexes, FK `onDelete` behaviour. Money = integer PKR (`price` is null only on drafts). Timestamps = `timestamptz`. IDs = `text`. Columns = snake_case. No size columns: suits are unstitched.
   **Need a migration at all?** Filter values (fabric, design, colour family and so on) live in `docs/catalog.md` §4 and `packages/validators`, not database enums, so a new value needs no migration.
2. **Test first** — integration test in `packages/core/**/*.int.test.ts` (or `packages/db/**`) that uses the new structure; run it → fails.
3. **Schema** — edit `packages/db/schema/*.ts`. Add indexes for every FK and for new filter/sort columns.
4. **Generate** — `pnpm db:generate`. **Read the generated SQL**: no unexpected drops/renames (drizzle may interpret a rename as drop + add — fix by writing the rename manually), correct defaults, `create extension` where needed.
5. **Apply** to the Neon `dev` branch — `pnpm db:migrate`. Then `pnpm test`.
6. **Docs** — update `docs/database.md` (table + index sections, ER diagram if relations changed).
7. **Ship** — `ship-change` (commit schema + migration + tests + docs together).

## How migrations reach production
They run in the storefront's build only: previews migrate the Neon `preview` branch, and production migrates `main`, **before** the new code goes live. A rollback in Netlify doesn't undo a migration.

**Cost:** any `packages/db` change rebuilds both sites, so 30 credits at the next merge to `main` (`docs/deployment.md` §2–3). Batch schema changes where you can.

## Backward-compatible changes (production has live data)
Both sites may build at once, and a rollback puts old code back on the new schema, so every migration must work with the code before and after it.

| Want | Do it in releases |
|---|---|
| Add required column | 1) add nullable/with default → 2) backfill → 3) set NOT NULL |
| Rename column | 1) add new → 2) write both, read new → 3) backfill → 4) drop old (later release) |
| Drop column/table | 1) stop using it in code → 2) drop in a later release (owner approval) |
| Change type | add new column + backfill, never in-place on big tables |

## Never
- Edit a migration that's already committed/applied (a hook blocks this) — create a new one.
- `drizzle-kit push` against production (denied in settings).
- Touch the production branch through the `neon` MCP without the owner's approval. Destructive changes always need it.
- Store secrets or plain passwords in any table.
