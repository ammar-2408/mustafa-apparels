// Cloudinary delivery URLs for the admin's previews (docs/integrations.md, Video). The storefront
// has its own loader; these only need to look right at thumbnail size.
const BASE = (cloudName: string) => `https://res.cloudinary.com/${cloudName}`;

// A 3:4 thumbnail cropped from the top, like the storefront's grid cards.
export const imageThumbUrl = (cloudName: string, publicId: string, width = 320) =>
  `${BASE(cloudName)}/image/upload/f_auto,q_auto,c_fill,g_north,ar_3:4,w_${width}/${publicId}`;

// The silent 720 px H.264 version made at upload (VIDEO_EAGER).
export const videoDeliveryUrl = (cloudName: string, publicId: string) =>
  `${BASE(cloudName)}/video/upload/ac_none,c_limit,w_720,q_auto,vc_h264/${publicId}.mp4`;

// The owner's chosen poster photo, or the video's first frame.
export const videoPosterUrl = (
  cloudName: string,
  publicId: string,
  posterPublicId: string | null,
  width = 720,
) =>
  posterPublicId
    ? `${BASE(cloudName)}/image/upload/f_auto,q_auto,c_limit,w_${width}/${posterPublicId}`
    : `${BASE(cloudName)}/video/upload/so_0,f_auto,q_auto,c_limit,w_${width}/${publicId}.jpg`;
