// Live check of the admin's Cloudinary path against the real account (docs/integrations.md).
// Run by hand, never in CI: `pnpm smoke:cloudinary`. It uploads a 1×1 test photo to
// products/e2e-live-<random>/, reads it back, checks the refusal rules, and deletes it. It prints
// names and results only, never a key or secret.
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

import { loadEnvFiles } from '@mustafa/config/env';
import {
  assetPrefix,
  AssetRejected,
  deleteAsset,
  getAsset,
  type MediaConfig,
  signUpload,
  verifyAsset,
} from '@mustafa/core/integrations/media';

// The same env files the admin app reads: its own .env.local, then the root one.
loadEnvFiles(join(__dirname, '..', 'apps', 'admin'));

const config: MediaConfig = {
  mode: 'live',
  appEnv: 'development',
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
};
if (!config.cloudName || !config.apiKey || !config.apiSecret) {
  console.error(
    'Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
  );
  process.exit(1);
}

// A valid 1×1 PNG, built here so no file is needed.
function tinyPng() {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, 168, 201, 200]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const TINY_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

let failures = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

async function upload(
  signed: ReturnType<typeof signUpload>,
  file: Buffer,
  name: string,
  type: string,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) form.append(key, value);
  form.append('file', new Blob([new Uint8Array(file)], { type }), name);
  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

// The scripts folder compiles as CommonJS, so no top-level await.
async function main() {
  const suitId = `e2e-live-${randomUUID().slice(0, 8)}`;
  const prefix = assetPrefix('product', suitId);
  let publicId: string | null = null;

  try {
    const signed = signUpload(config, { kind: 'image', target: 'product', targetId: suitId });
    publicId = signed.publicId;
    const first = await upload(signed, tinyPng(), 'smoke.png', 'image/png');
    check(
      first.status === 200,
      'signed photo upload accepted (asset_folder, allowed_formats, overwrite=false)',
      `HTTP ${first.status}`,
    );
    check(first.body.public_id === publicId, 'Cloudinary kept the public id the server chose');

    const again = await upload(signed, tinyPng(), 'smoke.png', 'image/png');
    check(
      again.status === 200 && again.body.existing === true,
      'a second upload with the same signature does not overwrite',
      `existing=${String(again.body.existing)}`,
    );

    const asset = await verifyAsset(config, publicId, { kind: 'image', prefix });
    check(
      asset.bytes > 0 && asset.width === 1 && asset.format === 'png',
      'read back from the Admin API with Cloudinary’s own figures',
      `${asset.format} ${asset.width}×${asset.height}, ${asset.bytes} bytes`,
    );
    check(
      Math.abs(Date.now() / 1000 - asset.createdAt) < 600,
      'created_at is recent (the 1-hour rule can work)',
    );

    const elsewhere = await verifyAsset(config, publicId, {
      kind: 'image',
      prefix: assetPrefix('product', 'another-suit'),
    }).then(
      () => null,
      (error: unknown) => error,
    );
    check(elsewhere instanceof AssetRejected, 'refused when it belongs to another suit');
    check((await getAsset(config, publicId, 'image')) !== null, '…and not deleted by that refusal');

    const gifSigned = signUpload(config, { kind: 'image', target: 'product', targetId: suitId });
    const gif = await upload(gifSigned, TINY_GIF, 'smoke.gif', 'image/gif');
    check(
      gif.status === 400,
      'a GIF is refused by the signed allowed_formats',
      `HTTP ${gif.status}`,
    );
    if (gif.status === 200) await deleteAsset(config, gifSigned.publicId, 'image');

    check(await deleteAsset(config, publicId, 'image'), 'deleted with a signed destroy');
    check((await getAsset(config, publicId, 'image')) === null, '…and gone');
    publicId = null;
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL  unexpected error: ${error instanceof Error ? `${error.name}: ${error.message}` : 'unknown'}`,
    );
  } finally {
    // Never leave the test file behind.
    if (publicId) await deleteAsset(config, publicId, 'image').catch(() => false);
  }

  console.log(
    failures === 0 ? '\nAll Cloudinary checks passed.' : `\n${failures} check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
