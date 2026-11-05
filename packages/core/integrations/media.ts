// Cloudinary for suit photos and videos (docs/integrations.md, docs/auth-security.md uploads).
// The browser uploads straight to Cloudinary with a signature from our server, which picks the
// public id, folder and allowed formats. On save the server reads the asset back from Cloudinary
// (step 4.4), so sizes and lengths never come from the browser. No SDK: signing is a SHA-1 over
// the sorted parameters, and the Admin API is plain fetch.
//
// Mock mode (CI, local E2E): the same signature, checked by the admin's /api/upload/mock route,
// which records each "upload" as a JSON file in .e2e-media/ for getAsset to read back.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { MEDIA_LIMITS, type MediaKind } from '@mustafa/validators/media';

export { MEDIA_LIMITS, type MediaKind };
export type UploadTarget = 'product' | 'category';

// A signed upload may be saved within this long (Cloudinary itself accepts a signature for 1 h).
export const UPLOAD_MAX_AGE_SECONDS = 60 * 60;

// The delivery version made at upload: no audio, at most 720 px wide, H.264 MP4.
export const VIDEO_EAGER = 'ac_none,c_limit,w_720,q_auto,vc_h264/mp4';

// Every asset of one suit or collection lives under its own prefix.
export const assetPrefix = (target: UploadTarget, targetId: string) =>
  `${target === 'product' ? 'products' : 'categories'}/${targetId}/`;

type Params = Record<string, string | number>;

// Cloudinary's signature: params sorted by name, `k=v` joined with &, the secret appended, SHA-1.
export function cloudinarySignature(params: Params, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(payload + secret)
    .digest('hex');
}

export type MediaConfig = {
  mode: 'live' | 'mock';
  appEnv: string | undefined;
  cloudName: string | undefined;
  apiKey: string | undefined;
  apiSecret: string | undefined;
};

// Mock mode signs with fixed values, so CI needs no Cloudinary account.
export const MOCK_CLOUD = { cloudName: 'demo', apiKey: 'mock-key', apiSecret: 'mock-secret' };
export const MOCK_UPLOAD_PATH = '/api/upload/mock';

export function credentials(config: MediaConfig) {
  if (config.mode === 'mock') return MOCK_CLOUD;
  const { cloudName, apiKey, apiSecret } = config;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
    );
  }
  return { cloudName, apiKey, apiSecret };
}

export type SignedUpload = {
  uploadUrl: string;
  publicId: string;
  // Every form field the browser sends with the file, signature included.
  fields: Record<string, string>;
};

type SignOptions = {
  kind: MediaKind;
  target: UploadTarget;
  targetId: string;
  // Unix seconds.
  now?: number;
  // A poster image for a video gets its own name, so it reads clearly in the media library.
  purpose?: 'poster';
};

export function signUpload(config: MediaConfig, options: SignOptions): SignedUpload {
  const { cloudName, apiKey, apiSecret } = credentials(config);
  const { kind, target, targetId, now = Math.floor(Date.now() / 1000), purpose } = options;
  const prefix = assetPrefix(target, targetId);
  const publicId = `${prefix}${purpose === 'poster' ? 'poster-' : ''}${randomUUID()}`;
  const params: Params = {
    public_id: publicId,
    // Shown as the folder in Cloudinary's media library, whichever folder mode the account uses.
    asset_folder: prefix.slice(0, -1),
    allowed_formats: MEDIA_LIMITS[kind].formats.join(','),
    timestamp: now,
    ...(kind === 'video' && { eager: VIDEO_EAGER, eager_async: 'true' }),
  };
  const fields = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return {
    uploadUrl:
      config.mode === 'mock'
        ? MOCK_UPLOAD_PATH
        : `https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`,
    publicId,
    fields: { ...fields, api_key: apiKey, signature: cloudinarySignature(params, apiSecret) },
  };
}

// The fields Cloudinary leaves out of the signature.
const UNSIGNED = new Set(['file', 'api_key', 'signature', 'resource_type', 'cloud_name']);

// For the mock upload route: the same check Cloudinary makes on a signed upload.
export function verifyUploadSignature(fields: Record<string, string>, apiSecret: string) {
  const signed = Object.fromEntries(Object.entries(fields).filter(([key]) => !UNSIGNED.has(key)));
  return fields.signature === cloudinarySignature(signed, apiSecret);
}

// What Cloudinary reports about a stored asset; the only source of sizes and lengths.
export type AssetInfo = {
  publicId: string;
  kind: MediaKind;
  format: string;
  bytes: number;
  width: number;
  height: number;
  durationSeconds: number | null;
  // Unix seconds.
  createdAt: number;
};

export const MEDIA_STORE = '.e2e-media';

// The repo root holds pnpm-workspace.yaml; Next runs from apps/<app>, Playwright from the root.
export function defaultMediaStoreDir(start = process.cwd()) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return join(dir, MEDIA_STORE);
    if (dirname(dir) === dir) return join(start, MEDIA_STORE);
  }
}

const storeFile = (dir: string, publicId: string) =>
  join(dir, `${Buffer.from(publicId).toString('base64url')}.json`);

// Mock mode's stand-in for Cloudinary's storage: one JSON file per asset.
export function createMockStore(dir = defaultMediaStoreDir()) {
  return {
    save(asset: AssetInfo) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(storeFile(dir, asset.publicId), JSON.stringify(asset, null, 2));
    },
    get(publicId: string): AssetInfo | null {
      const file = storeFile(dir, publicId);
      return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as AssetInfo) : null;
    },
    remove(publicId: string) {
      rmSync(storeFile(dir, publicId), { force: true });
    },
  };
}

// --- Reading back and deleting (step 4.4) ---

type ApiOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  storeDir?: string;
};

const API_TIMEOUT_MS = 10_000;

type CloudinaryResource = {
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  duration?: number;
  created_at: string;
};

// What Cloudinary holds under this public id, or null if nothing.
export async function getAsset(
  config: MediaConfig,
  publicId: string,
  kind: MediaKind,
  { fetchImpl = fetch, timeoutMs = API_TIMEOUT_MS, storeDir }: ApiOptions = {},
): Promise<AssetInfo | null> {
  if (config.mode === 'mock') {
    const asset = createMockStore(storeDir).get(publicId);
    return asset?.kind === kind ? asset : null;
  }
  const { cloudName, apiKey, apiSecret } = credentials(config);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${kind}/upload/${publicId
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Cloudinary answered ${response.status}`);
  const resource = (await response.json()) as CloudinaryResource;
  return {
    publicId: resource.public_id,
    kind,
    format: resource.format,
    bytes: resource.bytes,
    width: resource.width,
    height: resource.height,
    durationSeconds: kind === 'video' ? (resource.duration ?? null) : null,
    createdAt: Math.floor(Date.parse(resource.created_at) / 1000),
  };
}

// Deletes the asset and its cached copies. True when it is gone (or was never there).
export async function deleteAsset(
  config: MediaConfig,
  publicId: string,
  kind: MediaKind,
  { fetchImpl = fetch, timeoutMs = API_TIMEOUT_MS, storeDir }: ApiOptions = {},
): Promise<boolean> {
  if (config.mode === 'mock') {
    createMockStore(storeDir).remove(publicId);
    return true;
  }
  const { cloudName, apiKey, apiSecret } = credentials(config);
  const params = {
    public_id: publicId,
    invalidate: 'true',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    api_key: apiKey,
    signature: cloudinarySignature(params, apiSecret),
  });
  const response = await fetchImpl(`https://api.cloudinary.com/v1_1/${cloudName}/${kind}/destroy`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return false;
  const { result } = (await response.json()) as { result?: string };
  return result === 'ok' || result === 'not found';
}

const formatName = (format: string) => format.toUpperCase().replace('JPG', 'JPEG');

// Why an asset may not be saved, in words for the owner; empty when it may.
export function assetProblems(
  asset: AssetInfo,
  {
    kind,
    prefix,
    now = Math.floor(Date.now() / 1000),
  }: { kind: MediaKind; prefix: string; now?: number },
): string[] {
  const limits = MEDIA_LIMITS[kind];
  const problems: string[] = [];
  if (asset.kind !== kind)
    problems.push(kind === 'image' ? 'This is not a photo.' : 'This is not a video.');
  if (!asset.publicId.startsWith(prefix) || asset.publicId.includes('..')) {
    problems.push('This file was uploaded for something else.');
  }
  if (!(limits.formats as readonly string[]).includes(asset.format)) {
    problems.push(
      `${formatName(asset.format)} files can't be used. Use ${limits.formats.map(formatName).join(', ')}.`,
    );
  }
  if (asset.bytes > limits.maxBytes) {
    problems.push(`The file is over ${limits.maxBytes / (1024 * 1024)} MB.`);
  }
  if (kind === 'video') {
    const seconds = asset.durationSeconds;
    if (seconds === null || seconds > MEDIA_LIMITS.video.maxSeconds) {
      problems.push(`The video is longer than ${MEDIA_LIMITS.video.maxSeconds} seconds.`);
    }
  }
  if (now - asset.createdAt > UPLOAD_MAX_AGE_SECONDS) {
    problems.push('This upload is more than an hour old. Upload it again.');
  }
  return problems;
}

export class AssetRejected extends Error {
  constructor(readonly problems: string[]) {
    super('Asset rejected');
    this.name = 'AssetRejected';
  }
}

// The save-time check (docs/auth-security.md §5): read the asset back from Cloudinary and refuse,
// and delete, anything outside the limits. Returns Cloudinary's figures, never the browser's.
export async function verifyAsset(
  config: MediaConfig,
  publicId: string,
  expected: { kind: MediaKind; prefix: string; now?: number },
  options: ApiOptions = {},
): Promise<AssetInfo> {
  const asset = await getAsset(config, publicId, expected.kind, options);
  if (!asset) throw new AssetRejected(['The upload could not be found. Upload it again.']);
  const problems = assetProblems(asset, expected);
  if (problems.length > 0) {
    // Only an upload made for this suit or collection is deleted: an id that points elsewhere
    // (another suit's photo) is refused but never removed.
    if (asset.publicId.startsWith(expected.prefix) && !asset.publicId.includes('..')) {
      await deleteAsset(config, publicId, expected.kind, options);
    }
    throw new AssetRejected(problems);
  }
  return asset;
}

// The stored delivery URL of the original; transformations are added when it is shown.
export const assetUrl = (config: MediaConfig, asset: AssetInfo) =>
  `https://res.cloudinary.com/${credentials(config).cloudName}/${asset.kind}/upload/${asset.publicId}.${asset.format}`;
