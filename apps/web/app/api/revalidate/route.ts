// Called by the admin after every save (docs/api.md §4): refreshes the cached pages that show
// the changed data. Signed with REVALIDATE_SECRET, at most 5 minutes old, allow-listed tags only.
import { getEnv } from '@mustafa/config/env';
import { verifyRevalidate } from '@mustafa/core/integrations/revalidate';
import { revalidateTag } from 'next/cache';

const error = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const secret = getEnv('web').REVALIDATE_SECRET;
  if (!secret) return error(503, 'UNAVAILABLE', 'Revalidation is not set up here.');

  const check = verifyRevalidate({
    secret,
    timestamp: request.headers.get('x-timestamp'),
    signature: request.headers.get('x-signature'),
    body: await request.text(),
  });
  if (!check.ok) {
    return check.status === 401
      ? error(401, 'UNAUTHENTICATED', 'Signature check failed.')
      : error(400, 'VALIDATION', 'Bad request.');
  }

  // expire: 0, so the next visitor gets the owner's change, never one more stale view.
  for (const tag of check.tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: check.tags }, { headers: { 'Cache-Control': 'no-store' } });
}
