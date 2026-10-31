# Database

**PostgreSQL on Neon**, accessed only through **Drizzle ORM** in `packages/db`. Apps never write raw SQL in route files; queries live in `packages/core`.

## 1. Entity diagram

```mermaid
erDiagram
  user ||--o{ session : has
  user ||--o{ account : has
  user ||--o{ wishlist_item : saves
  user ||--o{ inquiry : sends
  user ||--o{ audit_log : performs
  category ||--o{ category : "parent of"
  category ||--o{ product : contains
  product ||--o{ product_image : has
  product ||--o{ wishlist_item : "saved in"
  product ||--o{ inquiry : "asked about"
  slug_redirect }o--|| product : "points to"
```

## 2. Tables

Conventions: `id` = `text` (cuid2/uuid v7), timestamps `timestamptz` default `now()`, snake_case columns, every FK indexed.

### Auth tables (owned by Better Auth — generate with its CLI, then extend)
| Table | Key columns |
|---|---|
| `user` | id, name, email (unique, lowercased), email_verified, image, **role** (`customer` \| `admin`, default `customer`), phone (nullable), banned, created_at, updated_at |
| `session` | id, user_id → user, token (unique), expires_at, ip_address, user_agent |
| `account` | id, user_id → user, provider_id (`credential`), **password** (scrypt hash — never plain text), created_at |
| `verification` | id, identifier, value, expires_at (email verification + password reset tokens) |
| `two_factor` | id, user_id, secret (encrypted), backup_codes (encrypted) — admins |

### Catalogue
**`category`**
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| name | text not null | |
| slug | text unique not null | lowercase, kebab-case |
| description | text | |
| image_url / image_public_id | text | Cloudinary |
| parent_id | text → category | nullable, for sub-collections |
| sort_order | int default 0 | |
| is_active | bool default true | hidden when false |
| seo_title, seo_description | text | fall back to name/description |
| created_at, updated_at | timestamptz | |

**`product`**
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| name | text not null | |
| slug | text unique not null | |
| description | text | plain text / limited markdown, sanitized |
| price | integer not null, check ≥ 0 | **whole PKR** (no floats for money) |
| compare_at_price | integer nullable | shows "was" price; check > price |
| currency | char(3) default `'PKR'` | |
| category_id | text → category, not null | |
| sizes | text[] default `{}` | e.g. `{XS,S,M,L,XL,Custom}` |
| colors | text[] default `{}` | |
| fabric | text | |
| availability | enum `in_stock` \| `low_stock` \| `out_of_stock` \| `made_to_order` | |
| status | enum `draft` \| `published` \| `archived` | only `published` is public |
| featured | bool default false | home page |
| attributes | jsonb default `{}` | future fields without migrations (e.g. embroidery, occasion) |
| seo_title, seo_description | text | |
| search_vector | tsvector **generated** | see §4 |
| published_at | timestamptz | set on first publish |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz nullable | soft delete |

**`product_image`**: id, product_id → product (cascade), url, public_id (unique), alt (not null), width, height, sort_order, is_primary. Partial unique index: one `is_primary = true` per product.

**`slug_redirect`**: id, entity (`product` \| `category`), old_slug (unique per entity), target_id, created_at. Written automatically when a slug changes; used for 301s so canonicals never point at dead URLs.

### Engagement
**`inquiry`**: id, product_id → product (nullable for general questions), user_id → user (nullable for guests), name, email, phone, message (≤ 2000 chars), status enum `new` \| `contacted` \| `closed`, ip_hash (sha256 of IP + salt, for abuse checks — not the raw IP), created_at, updated_at.

**`wishlist_item`**: user_id → user (cascade), product_id → product (cascade), created_at. PK (user_id, product_id).

### Admin
**`site_setting`**: key text PK, value jsonb, updated_at, updated_by → user. Keys: `shop_name`, `phone`, `whatsapp`, `email`, `address`, `hours`, `socials`, `default_seo`.

**`audit_log`**: id, actor_id → user, action (`product.create`, `product.update`, ...), entity, entity_id, changes jsonb (before/after, no secrets), created_at. Insert-only.

## 3. Indexes

| Index | Why |
|---|---|
| `product (status, category_id, published_at desc)` | collection pages |
| `product (status, featured)` | home page |
| `product (status, price)` | price sort/filter |
| GIN `product.search_vector` | full-text search |
| GIN trigram `product.name gin_trgm_ops` | typo-tolerant search |
| GIN `product.sizes`, `product.colors` | filters |
| `product_image (product_id, sort_order)` | gallery |
| `inquiry (status, created_at desc)` | admin inbox |
| `slug_redirect (entity, old_slug)` unique | redirect lookups |

## 4. Search column (Drizzle)

```ts
// packages/db/schema/product.ts (excerpt)
searchVector: tsvector('search_vector').generatedAlwaysAs(
  (): SQL => sql`
    setweight(to_tsvector('simple', coalesce(${product.name}, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(${product.fabric}, '') || ' ' ||
              array_to_string(${product.colors}, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(${product.description}, '')), 'C')`
),
```
- Use the `'simple'` text config (works for English and Roman Urdu words; no wrong stemming).
- Category name is matched with a join, not stored in the vector (so renaming a category needs no backfill).
- Enable extensions in the first migration: `create extension if not exists pg_trgm;`

Query shape (in `packages/core/search`):
```sql
select p.*, ts_rank(p.search_vector, q) as rank, similarity(p.name, $1) as sim
from product p, websearch_to_tsquery('simple', $1) q
where p.status = 'published' and p.deleted_at is null
  and (p.search_vector @@ q or p.name % $1)
order by rank desc, sim desc, p.published_at desc
limit $2 offset $3;
```
Always parameterized through Drizzle `sql` template — never string concatenation.

## 5. Migrations workflow

1. Edit schema in `packages/db/schema/*.ts`.
2. `pnpm db:generate` → review the SQL in `packages/db/migrations/` (commit it).
3. `pnpm db:migrate` against your dev branch; run `pnpm test`.
4. CI applies all migrations to a fresh Postgres container before integration and E2E tests.
5. Production migrations run in the storefront's production build (`pnpm db:migrate && …`, see `docs/setup.md` §5) **before** the new code goes live. Migrations must be backward compatible (add → backfill → switch → remove in a later release).

Rules: never edit an applied migration; never use `drizzle-kit push` on production; destructive changes need owner approval. Use the `db-change` skill.

## 6. Seed (`pnpm db:seed`)

- Categories: e.g. Formal, Casual, Party Wear, Bridal, Lawn, Maxi (owner can rename).
- 12 demo dresses with placeholder images (marked `draft` in production seeds).
- Site settings with placeholder contact details.
- First admin from `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` env vars (forced to set up 2FA on first login). Idempotent: running twice changes nothing.

## 7. Data rules

- Money is integer PKR. Format with `Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })`.
- Emails stored lowercase and trimmed.
- Soft delete products (`deleted_at`); hard delete only via an admin "purge" with confirmation.
- Deleting a user account cascades sessions, accounts and wishlist; inquiries are kept but anonymized (name → "Deleted user", email/phone cleared).
- Backups: Neon point-in-time restore on the free plan covers a short window; also run a weekly `pg_dump` (GitHub Action to a private artifact) once real data exists.

## 8. Connection

- `packages/db/client.ts` exports one Drizzle client using Neon's serverless driver (HTTP for single queries, WebSocket pool for transactions).
- Use the **pooled** connection string in apps; the direct string only for migrations.
- Tests: unit tests mock nothing in `core` that touches SQL — they run against PGlite (in-memory Postgres) or a Neon test branch. See `docs/testing-qa.md`.
