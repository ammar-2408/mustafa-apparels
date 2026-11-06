// GET /api/suits: every published suit as a card with its filter fields, for filtering and
// sorting in the browser (ADR-018, docs/api.md). Static and tagged: no per-request work, and an
// admin save refreshes it with the products tag.
import { listForFilters, REVALIDATE_SECONDS } from '../../../lib/catalog';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const suits = await listForFilters();
  return Response.json(
    { suits },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      },
    },
  );
}
