// Filter conditions shared by products.list and search (docs/catalog.md §4). A suit matches any
// value within one filter, and every filter that is set. priceMax is inclusive.
import { product } from '@mustafa/db/schema';
import type { ProductFilters } from '@mustafa/validators/search';
import { and, arrayOverlaps, gte, inArray, lte, type SQL } from 'drizzle-orm';

export function filterConditions(filters: ProductFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    filters.pieces?.length ? inArray(product.pieces, filters.pieces) : undefined,
    filters.dressCategories?.length
      ? arrayOverlaps(product.dressCategories, filters.dressCategories)
      : undefined,
    filters.fabric?.length ? inArray(product.fabric, filters.fabric) : undefined,
    filters.design?.length ? arrayOverlaps(product.design, filters.design) : undefined,
    filters.season?.length ? inArray(product.season, filters.season) : undefined,
    filters.outfitStyle?.length ? inArray(product.outfitStyle, filters.outfitStyle) : undefined,
    filters.colorFamily?.length ? inArray(product.colorFamily, filters.colorFamily) : undefined,
    filters.priceMin !== undefined ? gte(product.price, filters.priceMin) : undefined,
    filters.priceMax !== undefined ? lte(product.price, filters.priceMax) : undefined,
  ];
  return and(...conditions);
}
