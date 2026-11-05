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
  product ||--o{ product_media : has
  product ||--o{ wishlist_item : "saved in"
  product ||--o{ inquiry : "asked about"
  slug_redirect }o--|| product : "points to"
```

## 2. Tables

Conventions: `id` = `text` (cuid2/uuid v7), timestamps `timestamptz` default `now()`, snake_case columns, every FK indexed.

### Auth tables (owned by Better Auth — generate with its CLI, then extend)

`user` came first, at step 2.5 (`packages/db/schema/user.ts`), because the admin tables point at it. Checks: email equals `lower(email)`, role is `customer` or `admin`. The rest arrived at step 3.2 in migration `0007_auth` (`schema/auth.ts`), written by hand after comparing with `npx auth@1.7.15 generate`. Field names match Better Auth's, because its Drizzle adapter maps by them. IDs are UUID v7, through Better Auth's `generateId`. Every auth table cascades on user delete.

| Table | Key columns |
|---|---|
| `user` | id, name, email (unique, lowercased), email_verified, image, **role** (`customer` \| `admin`, default `customer`), phone (nullable), banned, two_factor_enabled (default false), created_at, updated_at. `role`, `phone` and `banned` can't be set through sign-up or a profile update (`input: false`) |
| `session` | id, user_id → user, token (unique), expires_at, ip_address (**an HMAC of the IP**, never the address), user_agent, **app** (`web` \| `admin`, checked: the admin accepts only its own sessions), created_at, updated_at |
| `account` | id, user_id → user, account_id, provider_id (`credential`), **password** (scrypt hash, `salt:key` in hex, never plain text), unused OAuth token columns, created_at, updated_at |
| `verification` | id, identifier (indexed), value, expires_at, created_at, updated_at (email verification + password reset tokens) |
| `two_factor` | id, user_id, secret (encrypted), backup_codes (encrypted), verified, failed_verification_count, locked_until (admins only) |

There's no Better Auth admin plugin (`docs/architecture.md` ADR-020), so there are no `ban_reason`, `ban_expires` or `impersonated_by` columns.

### Catalogue
**`category`** (shown to customers as "collections")
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| name | text not null | Dhanak, Khaddar, Lajwanti |
| slug | text unique not null | lowercase, kebab-case |
| description | text | |
| image_url / image_public_id | text | Cloudinary |
| parent_id | text → category | nullable, for sub-collections. Deleting the parent makes them top-level (`on delete set null`) |
| sort_order | int default 0 | |
| is_active | bool default true | hidden when false |
| seo_title, seo_description | text | fall back to name/description |
| created_at, updated_at | timestamptz | |

**`product`**
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| name | text not null | Pattern: `Black Embroidered Dhanak 3-Piece Suit` |
| slug | text unique not null | e.g. `black-embroidered-dhanak-3-piece-dhn-01` |
| design_code | text, unique when set | The shop's own code, e.g. `DHN-01`, `KDR-13`. Shown to customers and included in WhatsApp messages |
| import_key | text, unique when set | The `design_id` from `catalog/`. Set by the import script so re-runs change nothing; null for products created in admin |
| description | text | plain text / limited markdown, sanitized |
| price | integer **nullable**, check ≥ 0 | **whole PKR** (no floats for money). Null only on drafts |
| compare_at_price | integer nullable | shows "was" price; check > price |
| currency | char(3) default `'PKR'` | |
| category_id | text → category, not null | The collection. `on delete restrict`: a collection that still has suits can't be deleted |
| pieces | enum `two_piece` \| `three_piece`, not null | Filterable |
| piece_details | jsonb default `[]` | `[{ "piece": "shirt", "fabric": "Dhanak", "finish": "Embroidered", "length_m": 3 }, ...]`. Pieces: `shirt`, `dupatta`, `trouser`. `fabric`, `finish` and `length_m` are optional. `length_m` is the fabric length in metres |
| collection_type | text nullable | Display tag, e.g. `Premium`. Not a filter |
| dress_categories | text[] default `{}` | Filterable. Values: `docs/catalog.md` §4 |
| fabric | text not null | Main fabric: `Dhanak`, `Khaddar`. Lajwanti suits are `Dhanak`. Filterable |
| design | text[] default `{}` | Filterable. e.g. `Embroidered`, `Floral Print` |
| season | enum `winter` \| `summer` \| `all_season`, nullable | Filterable |
| outfit_style | text nullable | Filterable. e.g. `Traditional Suit` |
| main_color | text nullable | Name shown on the page, e.g. `Sage green`. Required to publish |
| color_family | text nullable | The filter value, e.g. `Green`. Required to publish |
| accent_colors | text[] default `{}` | Print or embroidery colours |
| motifs | text[] default `{}` | e.g. `paisley`. Search and description only |
| related_design_codes | text[] default `{}` | The same design in other colours. Each is still its own product |
| care_instructions | text | Hidden on the product page when empty |
| availability | enum `in_stock` \| `low_stock` \| `out_of_stock`, default `in_stock` | The import uses the default; the owner changes it in admin |
| status | enum `draft` \| `published` \| `archived` | only `published` is public |
| featured | bool default false | home page |
| attributes | jsonb default `{}` | future fields without migrations |
| seo_title, seo_description | text | |
| search_vector | tsvector **generated** | see §4 |
| published_at | timestamptz | set on first publish |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz nullable | soft delete |

Check constraints on `product`:
- `status <> 'published' OR price IS NOT NULL`: a published suit always has a price.
- `compare_at_price IS NULL OR (price IS NOT NULL AND compare_at_price > price)`.

There is **no sizes column**. Suits are unstitched. Allowed filter values live in `docs/catalog.md` §4 and are enforced by `packages/validators`, not by database enums, so a new fabric or design needs no migration.

**`product_media`** (photos and videos)
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| product_id | text → product, cascade | |
| kind | enum `media_kind`: `image` \| `video`, not null | |
| url | text not null | Cloudinary delivery URL |
| public_id | text unique not null | |
| alt | text not null | Required for photos and videos |
| width, height | int not null | |
| bytes | int not null | |
| format | text not null | |
| duration_seconds | numeric nullable | Required for videos, max 60 |
| poster_public_id | text nullable | Videos only; if null, the first frame is used |
| sort_order | int default 0 | |
| is_primary | bool default false | Main image |

Rules:
- Partial unique index: one `is_primary = true` per product.
- Check: `is_primary = false OR kind = 'image'`. The main item is always a photo, because it feeds LCP, the share image and JSON-LD.
- **The main image is the first photo in the order** (`packages/core/media`): reordering makes the first photo main, `setPrimary` moves the chosen photo to the front, and removing the main photo hands it to the next one. A suit's first photo becomes main when added.
- Check: `kind = 'image' OR (duration_seconds IS NOT NULL AND duration_seconds <= 60)`.
- Publishing (`core.products.setStatus`) requires a price, a colour, a main image and alt text on all media, and refuses any product whose media or text fails §9. Every problem comes back at once, by field (`price`, `colorFamily`, `media`, or the text field with the brand name). `published_at` is set on the first publish only. An archived suit must be restored to a draft before it can be published. `setStatus` is the only way the status changes (`core/products/publish.ts` holds the rules).

**`slug_redirect`**: id, entity (enum `redirect_entity`: `product` \| `category`), old_slug (unique per entity), target_id (indexed; no foreign key, because it points at either table), created_at. Written automatically when a slug changes; used for 301s so canonicals never point at dead URLs. A slug that comes back into use, by a rename back or a new page, deletes its redirect, so a live page always wins. A collection redirect resolves only to a visible collection.

### Engagement
**`inquiry`**: id, product_id → product (nullable for general questions), user_id → user (nullable for guests), name, email (nullable), phone (nullable, E.164), message (≤ 2000 chars, also a check), status enum `inquiry_status`: `new` \| `contacted` \| `closed`, ip_hash (sha256 of IP + salt, for abuse checks — not the raw IP), created_at, updated_at. Every inquiry has a phone or an email or both (owner's decision, 2026-11-02), checked in `packages/validators`. Deleting the suit or the account keeps the inquiry and clears the link (`on delete set null`).

**`wishlist_item`**: user_id → user (cascade), product_id → product (cascade), created_at. PK (user_id, product_id).

### Admin
**`site_setting`**: key text PK, value jsonb (validated per key in `packages/validators`), updated_at, updated_by → user (`on delete set null`). Keys: `shop_name`, `phone`, `whatsapp`, `email`, `service_area`, `delivery_info`, `payment_info`, `return_policy`, `reply_note`, `socials`, `default_seo`.

There is no address or opening-hours setting. The shop is online-only with no fixed hours.

`core.settings.get` returns every key, with `null` for one the owner hasn't filled in. A stored value that fails its key's schema is treated as unset, and only the key is logged, never the value. `core.settings.set` takes a value parsed by `settingInput` (phones as E.164, email lower case), writes `updated_by`, and records before and after in `audit_log`. Saving the same value again writes nothing.

**`audit_log`**: id, actor_id → user, action (`product.create`, `product.update`, ...), entity, entity_id, changes jsonb (before/after, no secrets), created_at. Insert-only: a trigger (migration 0005) refuses updates and deletes. The one exception is the foreign key clearing `actor_id` when that user is deleted, so the history stays. `core.audit.list` shows 50 a page, newest first (by `created_at`, then the time-ordered id, because rows from one transaction share a timestamp), with the actor's name, and filters by entity, record and actor.

## 3. Indexes

| Index | Why |
|---|---|
| `product (status, category_id, published_at desc)` | collection pages |
| `product (status, featured)` | home page |
| `product (status, price)` | price sort/filter |
| `product (status, pieces)` | volume style filter |
| `product (status, fabric)`, `product (status, season)`, `product (status, outfit_style)`, `product (status, color_family)` | filters |
| Partial unique `product (design_code)` where not null | design code lookup |
| Partial unique `product (import_key)` where not null | safe re-import |
| GIN `product.search_vector` | full-text search |
| GIN trigram `product.name gin_trgm_ops` | typo-tolerant search |
| GIN `product.design`, `product.dress_categories` | filters |
| `product_media (product_id, sort_order)` | gallery |
| `inquiry (status, created_at desc)` | admin inbox |
| `slug_redirect (entity, old_slug)` unique | redirect lookups |

## 4. Search column (Drizzle)

Postgres only allows immutable expressions in a generated column, and `array_to_string` is not immutable. The first migration therefore creates a small wrapper:

```sql
create extension if not exists pg_trgm;

create function immutable_array_to_string(text[], text)
returns text language sql immutable parallel safe
as $$ select array_to_string($1, $2) $$;
```

```ts
// packages/db/schema/product.ts (excerpt)
searchVector: tsvector('search_vector').generatedAlwaysAs(
  (): SQL => sql`
    setweight(to_tsvector('simple', coalesce(${product.name}, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(${product.fabric}, '') || ' ' ||
              coalesce(${product.designCode}, '') || ' ' ||
              coalesce(${product.mainColor}, '') || ' ' ||
              coalesce(${product.colorFamily}, '') || ' ' ||
              immutable_array_to_string(${product.accentColors}, ' ') || ' ' ||
              immutable_array_to_string(${product.design}, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(${product.description}, '') || ' ' ||
              immutable_array_to_string(${product.motifs}, ' ')), 'C')`
),
```
- Use the `'simple'` text config (works for English and local fabric names like khaddar; no wrong stemming). It splits a design code such as `KDR-13` into `kdr` and `-13`, so exact codes are matched on `design_code`, not the vector.
- Collection name is matched with a join, not stored in the vector (so renaming a collection needs no backfill).

Query shape (in `packages/core/search`):
```sql
select p.*, ts_rank(p.search_vector, q) as rank, similarity(p.name, $1) as sim,
       (lower(p.design_code) = lower($1)) as code_match
from product p, websearch_to_tsquery('simple', $1) q
where p.status = 'published' and p.deleted_at is null
  and (p.search_vector @@ q or p.name % $1 or lower(p.design_code) = lower($1))
order by code_match desc nulls last, rank desc, sim desc, p.published_at desc
limit $2 offset $3;
```
Always parameterized through Drizzle `sql` template — never string concatenation.

**As built (step 2.13).** The shape above changed in three places, each pinned by a ranking test in `packages/core/search/search.int.test.ts`:
- **Prefix full-text** instead of `websearch_to_tsquery`, so a partial word works (`khad` finds Khaddar). The query is split into `[a-z0-9]` words and sent as `to_tsquery('simple', 'khad:* & …')`, still a bound parameter, so no word can act as a tsquery operator. The collection name is matched the same way through the join.
- **Typos use `word_similarity`, not `similarity` / `%`.** `similarity()` of a short query against a long suit name stays far below its 0.3 default, so "khadar" would miss. Each query word must have `word_similarity` above 0.4 (`TYPO_THRESHOLD`) against the suit or collection name, ANDed like the full-text words. Matching the whole query at once let "Sage Green … Khaddar 3-Piece Suit" find every Khaddar suit. Measured on Neon (Postgres 18): typos score 0.57–0.71, an unrelated word 0.20.
- **Design codes ignore hyphens and case** (`kdr13`, `KDR-13`) and always rank first.

Order: code match, `ts_rank`, name similarity, newest. Postgres rejects a constant in `ORDER BY`, so a matcher that can't apply (for example, an emoji-only query has no words) is left out of the order. `suggest` returns up to 2 matching collections, then suits, 6 in all, with only names, slugs and codes.

## 5. Migrations workflow

1. Edit schema in `packages/db/schema/*.ts`.
2. `pnpm db:generate` → review the SQL in `packages/db/migrations/` (commit it). Hand-written SQL (extensions, functions, triggers): `pnpm db:generate --custom --name=<what>`.
3. `pnpm db:migrate` against your dev branch; run `pnpm test`. It applies the migrations with `DATABASE_URL_UNPOOLED` through `packages/db/bin/migrate.ts` (drizzle-kit only generates). Integration tests apply the same files to PGlite (`@mustafa/db/testing`).
4. CI applies all migrations to a fresh `postgres:18` container (Neon's version) in both jobs.
5. Production migrations run in the storefront's production build (`docs/deployment.md` §2) **before** the new code goes live. Migrations must be backward compatible (add → backfill → switch → remove in a later release).

Rules: never edit an applied migration; never use `drizzle-kit push` on production; destructive changes need owner approval. Use the `db-change` skill.

## 6. Seed (`pnpm db:seed`)

- Categories: Dhanak (`dhanak`), Khaddar (`khaddar`), Lajwanti (`lajwanti`). The owner can rename or add more. Seeded **only when there are no collections at all**, so a later run never brings back one the owner renamed or deleted.
- Site settings: `shop_name` = Mustafa Apparels, `whatsapp` = `+923482799707`, `phone` = `+923069558717`, `service_area` = Pakistan, `email` = `ammarofficial321@gmail.com`. Each is inserted only when its key is missing, so the owner's edits stay. The other keys (delivery, payment, returns, reply note, socials, default SEO) stay unset until the owner fills them in admin.
- First admin from `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (step 3.2): a verified `admin` with a credential account holding Better Auth's scrypt hash. It's forced to set up 2FA on first login. Both variables are required, and the password must be 10 to 128 characters; errors name the variable, never the value. If an admin with that email exists, nothing changes, and the password is never reset. If a customer has that email, the seed stops rather than promoting them.
- `--e2e` flag only: 12 demo suits for tests (`E2E-01`…`E2E-12`): 10 published, 1 draft, 1 archived, across all three collections, both piece counts and every price band, one with a video and one with an old slug that redirects. Media use `products/e2e/demo-NN` on the `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` cloud. Refused when `APP_ENV` is `preview` or `production`. CI's `e2e` job runs `pnpm db:seed -- --e2e`. **Real stock comes from `catalog/` through the import script** (`docs/catalog.md` §6), never the seed.
- Code: `packages/db/seed.ts` (tested in `seed.int.test.ts`), run by `packages/db/bin/seed.ts` with `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`).

## 7. Data rules

- Money is integer PKR. Format with `Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })`.
- A product without a price shows only in admin.
- Emails stored lowercase and trimmed.
- Phone and WhatsApp numbers stored in E.164 format (`+923482799707`).
- Soft delete products (`deleted_at`); hard delete only via an admin "purge" with confirmation.
- Deleting a user account cascades sessions, accounts and wishlist; inquiries are kept but anonymized (name → "Deleted user", email/phone cleared).
- Backups: Neon point-in-time restore on the free plan covers a short window; also run a weekly `pg_dump` (GitHub Action to a private artifact) once real data exists.

## 8. Connection

- `packages/db/client.ts`: `getDb()` returns one shared Drizzle client for `DATABASE_URL`, created on first use; `createDb(url)` makes a new one. A `*.neon.tech` host uses Neon's serverless driver (WebSocket `Pool`, so transactions work). Any other host, such as CI's Postgres container, uses node-postgres, because only Neon speaks that driver's protocol. Errors name the variable, never its value.
- `core` functions take the client as their first argument, typed `Database`, so tests pass a PGlite client instead.
- IDs are UUID v7 from `uuidv7()` in `packages/db/id.ts` (time-ordered). Better Auth makes its own IDs for its tables.
- Use the **pooled** connection string in apps; the direct string only for migrations.
- Neon runs Postgres 18 (project `mustafa-apparels`, aws-us-east-2), with branches `production`, `dev` and `preview`.
- Tests: unit tests mock nothing in `core` that touches SQL — they run against PGlite (in-memory Postgres) or a Neon test branch. See `docs/testing-qa.md`.

## 9. Banned brand names

`packages/validators/banned-terms.ts` holds the names of brands the shop has no permission to use: Elaf, Baroque, Maria B (also `Maria.B`, `MariaB`), HS Fashion, Khaadi, Sobia Waseem, Nishat (also `Nishat Linen`) and So Kamal (also `SoKamal`). The check ignores case and punctuation, and matches whole names only, so fabric words and ordinary text such as `Khaddar`, `khadi` and `also Kamal` still pass. It also ignores accents, zero-width spaces and full-width letters, and spaces inside a name (`MARIAB`, `so-kamal`). Use `findBannedTerm(text)` for plain text and wrap a Zod string schema in `noBannedTerms(...)`; its message names the brand for the admin.

It runs on every customer-facing text field: product name, slug, description, care instructions, motifs, media alt text, SEO fields and collection text, and on every file in `catalog/` during import. Add a name here when new stock arrives showing another brand. The owner can remove a name only with written permission from that brand.
