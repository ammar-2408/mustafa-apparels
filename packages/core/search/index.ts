// Shop search and suggestions (docs/database.md §4, docs/architecture.md §6).
// Matches, best first: the design code (hyphens ignored), then prefix full-text over the search
// vector and the collection name, then typo-tolerant word similarity on suit and collection
// names. The query only ever reaches SQL as bound parameters.
import type { Database } from '@mustafa/db/client';
import { category, product, productMedia } from '@mustafa/db/schema';
import type { SearchInput, SuggestInput } from '@mustafa/validators/search';
import { and, count, eq, or, type SQL, sql } from 'drizzle-orm';

import { filterConditions } from '../products/filters';
import { cardColumns, isPublic, PAGE_SIZE, toCard } from '../products/index';

// word_similarity() of a short query against a long suit name. 0.4 catches one wrong or
// missing letter ("khadar", "dhanuk") without matching unrelated words.
export const TYPO_THRESHOLD = 0.4;

// Words of the query, [a-z0-9] only, so nothing in them can act as a tsquery operator.
const tokensOf = (q: string) => q.toLowerCase().match(/[a-z0-9]+/g) ?? [];

// "Sage-green khad" -> "sage:* & green:* & khad:*".
export function prefixQuery(q: string): string | null {
  const tokens = tokensOf(q);
  return tokens.length > 0 ? tokens.map((token) => `${token}:*`).join(' & ') : null;
}

const compactCode = (q: string) => q.toLowerCase().replace(/[^a-z0-9]/g, '');

const similarity = (text: string) =>
  sql<number>`greatest(word_similarity(${text}, ${product.name}), word_similarity(${text}, ${category.name}))`;

function matchers(q: string) {
  const prefix = prefixQuery(q);
  const tsquery = prefix === null ? null : sql`to_tsquery('simple', ${prefix})`;
  const code = compactCode(q);
  const codeMatch = code
    ? sql<boolean>`coalesce(regexp_replace(lower(${product.designCode}), '[^a-z0-9]', '', 'g') = ${code}, false)`
    : sql<boolean>`false`;
  const textMatch = tsquery
    ? sql<boolean>`(${product.searchVector} @@ ${tsquery} or to_tsvector('simple', ${category.name}) @@ ${tsquery})`
    : sql<boolean>`false`;
  // Every word must be close to a word in the suit or collection name, like the AND in the
  // full-text query; a whole long query would match any suit sharing most of its words.
  const tokens = tokensOf(q);
  const typoMatch =
    tokens.length > 0
      ? and(...tokens.map((token) => sql`${similarity(token)} > ${TYPO_THRESHOLD}`))!
      : sql<boolean>`false`;
  // Postgres rejects a constant in ORDER BY, so a matcher that can't apply is left out.
  const order: SQL[] = [
    ...(code ? [sql`${codeMatch} desc`] : []),
    ...(tsquery ? [sql`ts_rank(${product.searchVector}, ${tsquery}) desc`] : []),
    sql`${similarity(q)} desc`,
    sql`${product.publishedAt} desc nulls last`,
    sql`${product.id} desc`,
  ];
  return { where: or(codeMatch, textMatch, typoMatch)!, order };
}

export async function search(db: Database, input: SearchInput) {
  const { where: matches, order } = matchers(input.q);
  const where = and(isPublic, filterConditions(input.filters), matches);
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id))
      .leftJoin(
        productMedia,
        and(eq(productMedia.productId, product.id), eq(productMedia.isPrimary, true)),
      )
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((input.page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(product)
      .innerJoin(category, eq(product.categoryId, category.id))
      .where(where),
  ]);
  return {
    items: rows.map(toCard),
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export const SUGGESTION_LIMIT = 6;

// For the search box: matching collections first, then suits, six in all.
export async function suggest(db: Database, input: SuggestInput) {
  const prefix = prefixQuery(input.q);
  const similar = sql`word_similarity(${input.q}, ${category.name})`;
  const collections = await db
    .select({ name: category.name, slug: category.slug })
    .from(category)
    .where(
      and(
        eq(category.isActive, true),
        or(
          prefix === null
            ? undefined
            : sql`to_tsvector('simple', ${category.name}) @@ to_tsquery('simple', ${prefix})`,
          sql`${similar} > ${TYPO_THRESHOLD}`,
        ),
      ),
    )
    .orderBy(sql`${similar} desc`, category.sortOrder)
    .limit(2);

  const { where, order } = matchers(input.q);
  const products = await db
    .select({ name: product.name, slug: product.slug, designCode: product.designCode })
    .from(product)
    .innerJoin(category, eq(product.categoryId, category.id))
    .where(and(isPublic, where))
    .orderBy(...order)
    .limit(SUGGESTION_LIMIT - collections.length);

  return { collections, products };
}
