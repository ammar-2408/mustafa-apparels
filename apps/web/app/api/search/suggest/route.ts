// GET /api/search/suggest?q= (docs/api.md): up to 6 suits and 2 collections for the search box.
// Rate limited per IP; a short shared cache, since the same few words are typed again and again.
import * as search from '@mustafa/core/search';
import { getDb } from '@mustafa/db/client';
import { suggestInput } from '@mustafa/validators/search';
import type { NextRequest } from 'next/server';

import { SEARCH_LIMITS } from '../../../../lib/search-limits';
import { withinLimit } from '../../../../lib/services';

const EMPTY = { collections: [], products: [] };

export async function GET(request: NextRequest) {
  const parsed = suggestInput.safeParse({ q: request.nextUrl.searchParams.get('q') ?? '' });
  if (!parsed.success) {
    return Response.json(EMPTY, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  }
  const ip = request.headers.get('x-nf-client-connection-ip') ?? 'no-ip';
  if (!(await withinLimit(SEARCH_LIMITS.suggest, ip))) {
    return Response.json(
      { error: 'Too many searches. Please wait a moment.' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } },
    );
  }
  const found = await search.suggest(getDb(), parsed.data);
  return Response.json(found, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
}
