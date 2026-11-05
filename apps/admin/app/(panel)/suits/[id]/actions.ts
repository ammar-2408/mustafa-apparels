'use server';
import 'server-only';

import { CoreError, invalid, notFound } from '@mustafa/core/errors';
import {
  assetPrefix,
  AssetRejected,
  assetUrl,
  deleteAsset,
  IMPORTED_PREFIX,
  verifyAsset,
} from '@mustafa/core/integrations/media';
import * as media from '@mustafa/core/media';
import { getDb } from '@mustafa/db/client';
import {
  mediaAddInput,
  mediaAltInput,
  mediaDeleteInput,
  mediaPosterInput,
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
  // deleteAsset keeps imported stock (shared by the dev and production databases): log the id, so
  // a file that must not stay online can be found and deleted by hand.
  if (publicId.startsWith(IMPORTED_PREFIX)) {
    console.info(`[media] Imported stock file kept in Cloudinary: ${publicId}`);
    return;
  }
  const deleted = await deleteAsset(mediaConfig(), publicId, kind).catch(() => false);
  if (!deleted) console.error('[media] Cloudinary delete failed; the file is left over');
}

// A file already on a suit or collection is never attached twice, and never deleted by a refusal.
const inUse = (publicId: string) => media.isReferenced(getDb(), publicId);
const alreadyUsed = () =>
  new CoreError('CONFLICT', 'That file is already saved', {
    file: ['This upload is already in use. Upload the file again.'],
  });

const add = adminAction(mediaAddInput, async (input, { session }) => {
  const config = mediaConfig();
  if (await inUse(input.publicId)) throw alreadyUsed();
  let asset;
  try {
    asset = await verifyAsset(config, input.publicId, {
      kind: input.kind,
      prefix: assetPrefix('product', input.productId),
      inUse,
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

// A video's poster: a photo uploaded for this suit as a poster, or null for the first frame. The
// poster it replaces is deleted from Cloudinary once the new one is saved.
const setPoster = adminAction(mediaPosterInput, async (input, { session }) => {
  const db = getDb();
  const video = await media.getById(db, input.mediaId);
  if (!video) throw notFound('Video');
  if (input.posterPublicId && input.posterPublicId !== video.posterPublicId) {
    if (await inUse(input.posterPublicId)) throw alreadyUsed();
    try {
      await verifyAsset(mediaConfig(), input.posterPublicId, {
        kind: 'image',
        prefix: `${assetPrefix('product', video.productId)}poster-`,
        inUse,
      });
    } catch (error) {
      if (error instanceof AssetRejected) throw invalid({ file: error.problems });
      throw error;
    }
  }
  const { previous } = await media.setPoster(db, input, { actorId: session.user.id });
  if (previous && previous !== input.posterPublicId) await removeFromCloudinary(previous, 'image');
  await refresh(video.productId);
  return { id: video.id, posterPublicId: input.posterPublicId };
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

export async function setVideoPoster(raw: unknown) {
  return setPoster(raw);
}
