// Cloudinary credits an upload will use (free plan: 25 a month; docs/integrations.md, Budget).
// 1 credit = 1,000 transformations or 1 GB stored. Each upload is 1 transformation. The eager
// 720 px video (VIDEO_EAGER) is HD, 4 transformations per second, part seconds rounded up.
// Storage counts the original plus, for a video, an eager copy assumed at half its size.
// Viewing in admin and on the site comes on top, from bandwidth.
export type EstimateItem = { kind: 'image' | 'video'; bytes: number; seconds: number | null };

export type Estimate = {
  uploads: number;
  videoSeconds: number;
  transformations: number;
  storageGb: number;
  credits: number;
};

const HD_PER_SECOND = 4;
// An unreadable length counts as the 60-second maximum.
const UNKNOWN_SECONDS = 60;

export function estimateCredits(items: EstimateItem[]): Estimate {
  let videoSeconds = 0;
  let bytes = 0;
  for (const item of items) {
    bytes += item.bytes;
    if (item.kind === 'video') {
      videoSeconds += Math.ceil(item.seconds ?? UNKNOWN_SECONDS);
      bytes += item.bytes / 2;
    }
  }
  const transformations = items.length + videoSeconds * HD_PER_SECOND;
  const storageGb = bytes / 1024 ** 3;
  const credits = Math.round((transformations / 1000 + storageGb) * 100) / 100;
  return { uploads: items.length, videoSeconds, transformations, storageGb, credits };
}
