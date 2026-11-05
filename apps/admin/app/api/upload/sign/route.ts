// POST /api/upload/sign (docs/api.md §3): a Cloudinary signature for one photo or video of a
// suit or collection. The server picks the public id, folder and formats; the file itself goes
// from the browser to Cloudinary. Admin only, 30 a minute per admin.
import * as categories from '@mustafa/core/categories';
import { notFound } from '@mustafa/core/errors';
import { signUpload } from '@mustafa/core/integrations/media';
import * as products from '@mustafa/core/products';
import { getDb } from '@mustafa/db/client';
import { uploadSignInput } from '@mustafa/validators/media';

import { ADMIN_LIMITS, enforceLimit } from '../../../../lib/limits';
import { mediaConfig } from '../../../../lib/media';
import { adminRoute, parseJson } from '../../../../lib/route';

export const POST = adminRoute(async (request, { session }) => {
  const input = await parseJson(request, uploadSignInput);
  await enforceLimit(ADMIN_LIMITS.uploadSign, session.user.id);
  const db = getDb();
  const target =
    input.target === 'product'
      ? await products.getById(db, input.targetId)
      : await categories.getById(db, input.targetId);
  if (!target) throw notFound(input.target === 'product' ? 'Suit' : 'Collection');
  return signUpload(mediaConfig(), input);
});
