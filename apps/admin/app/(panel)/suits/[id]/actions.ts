'use server';
import 'server-only';

import { invalid } from '@mustafa/core/errors';
import {
  assetPrefix,
  AssetRejected,
  assetUrl,
  deleteAsset,
  verifyAsset,
} from '@mustafa/core/integrations/media';
import * as media from '@mustafa/core/media';
import { getDb } from '@mustafa/db/client';
import {
  mediaAddInput,
  mediaAltInput,
  mediaDeleteInput,
  mediaPrimaryInput,
  mediaReorderInput,
} from '@mustafa/validators/media';
import { revalidatePath } from 'next/cache';

import { adminAction } from '../../../../lib/action';
import { mediaConfig } from '../../../../lib/media';
import { revalidateStorefront } from '../../../../lib/revalidate';

// The admin page comes back with the action's answer (no separate router.refresh, which can
// queue a following action behind it), and the storefront's cards and product page refresh.
const refresh = (productId: string) => {
  revalidatePath(`/suits/${productId}`);
  return revalidateStorefront(['products', `product:${productId}`]);
};

// A failed Cloudinary delete leaves an orphan file, not a broken page: log and carry on.
async function removeFromCloudinary(publicId: string, kind: 'image' | 'video') {
  const deleted = await deleteAsset(mediaConfig(), publicId, kind).catch(() => false);
  if (!deleted) console.error('[media] Cloudinary delete failed; the file is left over');
}

const add = adminAction(mediaAddInput, async (input, { session }) => {
  const config = mediaConfig();
  let asset;
  try {
    asset = await verifyAsset(config, input.publicId, {
      kind: input.kind,
      prefix: assetPrefix('product', input.productId),
    });
  } catch (error) {
    if (error instanceof AssetRejected) throw invalid({ file: error.problems });
    throw error;
  }
  const row = await media.add(
    getDb(),
    {
      productId: input.productId,
      kind: input.kind,
      alt: input.alt,
      asset: { ...asset, url: assetUrl(config, asset) },
    },
    { actorId: session.user.id },
  );
  await refresh(input.productId);
  return { id: row.id, isPrimary: row.isPrimary };
});

const reorder = adminAction(mediaReorderInput, async (input, { session }) => {
  const result = await media.reorder(getDb(), input, { actorId: session.user.id });
  await refresh(input.productId);
  return result;
});

const setPrimary = adminAction(mediaPrimaryInput, async (input, { session }) => {
  const result = await media.setPrimary(getDb(), input, { actorId: session.user.id });
  await refresh(input.productId);
  return result;
});

const updateAlt = adminAction(mediaAltInput, async (input, { session }) => {
  const row = await media.updateAlt(getDb(), input, { actorId: session.user.id });
  await refresh(row.productId);
  return { id: row.id, alt: row.alt };
});

const remove = adminAction(mediaDeleteInput, async (input, { session }) => {
  const row = await media.remove(getDb(), input, { actorId: session.user.id });
  await removeFromCloudinary(row.publicId, row.kind);
  if (row.posterPublicId) await removeFromCloudinary(row.posterPublicId, 'image');
  await refresh(row.productId);
  return { id: row.id };
});

// A 'use server' file exports async functions only.
export async function addProductMedia(raw: unknown) {
  return add(raw);
}

export async function reorderProductMedia(raw: unknown) {
  return reorder(raw);
}

export async function setPrimaryProductImage(raw: unknown) {
  return setPrimary(raw);
}

export async function updateMediaAlt(raw: unknown) {
  return updateAlt(raw);
}

export async function deleteProductMedia(raw: unknown) {
  return remove(raw);
}
