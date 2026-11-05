// Where imported stock goes: Cloudinary (live) or the mock store (tests). The import asks first
// whether a file is already there, so re-runs and the production import upload nothing.
import {
  type AssetInfo,
  createMockStore,
  getAsset,
  type MediaConfig,
  type MediaKind,
  signImportUpload,
} from '@mustafa/core/integrations/media';
import sharp from 'sharp';

import { mp4Seconds } from './mp4';

export type Uploader = {
  find(publicId: string, kind: MediaKind): Promise<AssetInfo | null>;
  upload(publicId: string, kind: MediaKind, file: Buffer, fileName: string): Promise<AssetInfo>;
};

const UPLOAD_TIMEOUT_MS = 5 * 60_000;

export function liveUploader(config: MediaConfig, fetchImpl: typeof fetch = fetch): Uploader {
  return {
    find: (publicId, kind) => getAsset(config, publicId, kind, { fetchImpl }),
    async upload(publicId, kind, file, fileName) {
      const signed = signImportUpload(config, { kind, publicId });
      const form = new FormData();
      for (const [key, value] of Object.entries(signed.fields)) form.append(key, value);
      form.append('file', new Blob([new Uint8Array(file)]), fileName);
      const response = await fetchImpl(signed.uploadUrl, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
      if (!response.ok) {
        // Cloudinary's message names the problem (format, size); it never echoes the secret.
        const detail = await response.text().catch(() => '');
        throw new Error(
          `Cloudinary refused ${fileName} (${response.status}): ${detail.slice(0, 200)}`,
        );
      }
      // Read back from the Admin API, so the saved figures come from Cloudinary, as in admin.
      const asset = await getAsset(config, publicId, kind, { fetchImpl });
      if (!asset) throw new Error(`Cloudinary has no ${publicId} after uploading it`);
      return asset;
    },
  };
}

// Tests: the admin's mock store, with the figures measured from the file.
export function mockUploader(
  storeDir: string,
  now = () => Math.floor(Date.now() / 1000),
): Uploader {
  const store = createMockStore(storeDir);
  return {
    find: async (publicId) => store.get(publicId),
    async upload(publicId, kind, file, fileName) {
      const extension = fileName.split('.').pop()!.toLowerCase();
      const meta = kind === 'image' ? await sharp(file).metadata() : null;
      const asset: AssetInfo = {
        publicId,
        kind,
        format: kind === 'image' ? (meta!.format === 'jpeg' ? 'jpg' : meta!.format!) : extension,
        bytes: file.length,
        width: meta?.width ?? 720,
        height: meta?.height ?? 1280,
        durationSeconds: kind === 'video' ? mp4Seconds(file) : null,
        createdAt: now(),
      };
      store.save(asset);
      return asset;
    },
  };
}
