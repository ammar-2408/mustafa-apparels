// Browser side of an upload: ask our server for a signature, then send the file straight to
// Cloudinary (or the mock route), reporting progress. The asset is only kept once a save action
// has read it back and accepted it.
import type { MediaKind } from '@mustafa/validators/media';

export type UploadTarget = {
  kind: MediaKind;
  target: 'product' | 'category';
  targetId: string;
  purpose?: 'poster';
};

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

type Signed = { uploadUrl: string; publicId: string; fields: Record<string, string> };

async function sign(target: UploadTarget): Promise<Signed> {
  const response = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new UploadError(body?.error?.message ?? 'The upload could not start. Please try again.');
  }
  return (await response.json()) as Signed;
}

function send(
  { uploadUrl, fields }: Signed,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    form.append('file', file);
    const request = new XMLHttpRequest();
    request.open('POST', uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1);
        resolve();
        return;
      }
      // Cloudinary explains a refusal in error.message (wrong format, too big, bad signature).
      let reason: string | undefined;
      try {
        reason = (JSON.parse(request.responseText) as { error?: { message?: string } }).error
          ?.message;
      } catch {
        // Not JSON: keep the general message.
      }
      reject(
        new UploadError(
          reason ? `The upload was refused: ${reason}` : 'The upload failed. Please try again.',
        ),
      );
    };
    request.onerror = () => reject(new UploadError('The upload failed. Check the connection.'));
    request.send(form);
  });
}

// Resolves with the public id the server chose for this upload.
export async function uploadFile(
  file: File,
  target: UploadTarget,
  onProgress: (fraction: number) => void = () => {},
): Promise<string> {
  const signed = await sign(target);
  await send(signed, file, onProgress);
  return signed.publicId;
}

// A video's length in seconds, read by the browser before upload (NaN if it can't tell).
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const done = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done(Number.NaN);
    video.src = url;
  });
}
