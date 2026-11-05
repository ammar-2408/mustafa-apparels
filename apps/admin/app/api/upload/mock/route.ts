// Mock mode's stand-in for Cloudinary's upload API (local runs and CI only; 404 anywhere else).
// It makes the same signature check, then records the real file size and type in .e2e-media/,
// so E2E exercises the size and format checks on save without a Cloudinary account. A video's
// length comes from its file name ("clip-61s.mp4" is 61 s), since nothing here can decode it.
import { invalid } from '@mustafa/core/errors';
import {
  createMockStore,
  MEDIA_LIMITS,
  MOCK_CLOUD,
  verifyUploadSignature,
} from '@mustafa/core/integrations/media';

import { mockUploadsAllowed } from '../../../../lib/media';
import { adminRoute } from '../../../../lib/route';

const cloudinaryError = (status: number, message: string) =>
  Response.json({ error: { message } }, { status });

export async function POST(request: Request) {
  if (!mockUploadsAllowed()) return new Response(null, { status: 404 });
  return upload(request);
}

const upload = adminRoute(async (request) => {
  const form = await request.formData();
  const file = form.get('file');
  const fields = Object.fromEntries(
    [...form.entries()].filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
  if (!(file instanceof File)) throw invalid({ file: ['Choose a file'] });
  if (!verifyUploadSignature(fields, MOCK_CLOUD.apiSecret)) {
    return cloudinaryError(401, 'Invalid Signature');
  }
  const allowed = (fields.allowed_formats ?? '').split(',');
  const extension = (file.name.split('.').pop() ?? '').toLowerCase().replace('jpeg', 'jpg');
  if (!allowed.includes(extension)) {
    return cloudinaryError(400, `File format ${extension} not allowed`);
  }
  const kind = (MEDIA_LIMITS.video.formats as readonly string[]).includes(extension)
    ? 'video'
    : 'image';
  const seconds = Number(/-(\d+(?:\.\d+)?)s\.[a-z0-9]+$/i.exec(file.name)?.[1] ?? 12);
  const asset = {
    publicId: fields.public_id ?? '',
    kind,
    format: extension,
    bytes: file.size,
    width: kind === 'video' ? 720 : 1200,
    height: kind === 'video' ? 1280 : 1600,
    durationSeconds: kind === 'video' ? seconds : null,
    createdAt: Math.floor(Date.now() / 1000),
  } as const;
  createMockStore().save(asset);
  return {
    public_id: asset.publicId,
    resource_type: kind,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    ...(kind === 'video' && { duration: seconds }),
  };
});
