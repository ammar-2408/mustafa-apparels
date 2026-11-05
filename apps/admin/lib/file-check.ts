// The browser's check before an upload starts, so the owner hears at once that a file is too big
// or the wrong type. The server checks again on save, with Cloudinary's figures (verifyAsset).
import { MEDIA_LIMITS, type MediaKind } from '@mustafa/validators/media';

export type FileCheck = { ok: true; kind: MediaKind } | { ok: false; error: string };

const MB = 1024 * 1024;

export function kindOf(file: Pick<File, 'type'>): MediaKind | null {
  if ((MEDIA_LIMITS.image.mimeTypes as readonly string[]).includes(file.type)) return 'image';
  if ((MEDIA_LIMITS.video.mimeTypes as readonly string[]).includes(file.type)) return 'video';
  return null;
}

// `allow` narrows it, e.g. a poster must be a photo.
export function checkFile(
  file: Pick<File, 'type' | 'size' | 'name'>,
  allow: readonly MediaKind[] = ['image', 'video'],
): FileCheck {
  const kind = kindOf(file);
  if (!kind || !allow.includes(kind)) {
    const allowed = allow.includes('video')
      ? 'a JPEG, PNG or WebP photo, or an MP4, MOV or WebM video'
      : 'a JPEG, PNG or WebP photo';
    return { ok: false, error: `${file.name} can't be used. Choose ${allowed}.` };
  }
  const { maxBytes } = MEDIA_LIMITS[kind];
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `${file.name} is ${(file.size / MB).toFixed(1)} MB. ${
        kind === 'image' ? 'Photos' : 'Videos'
      } can be up to ${maxBytes / MB} MB.`,
    };
  }
  return { ok: true, kind };
}

export const MAX_VIDEO_SECONDS = MEDIA_LIMITS.video.maxSeconds;

export function checkDuration(name: string, seconds: number): string | null {
  return Number.isFinite(seconds) && seconds > MAX_VIDEO_SECONDS
    ? `${name} is ${Math.round(seconds)} seconds long. Videos can be up to ${MAX_VIDEO_SECONDS} seconds.`
    : null;
}

// The file input's accept list.
export const ACCEPT = {
  any: [...MEDIA_LIMITS.image.mimeTypes, ...MEDIA_LIMITS.video.mimeTypes].join(','),
  image: MEDIA_LIMITS.image.mimeTypes.join(','),
};
