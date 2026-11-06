'use client';

import { cloudNameOf, shapedImageUrl, videoPosterUrl } from '@mustafa/core/media-url';
import { Dialog } from '@mustafa/ui/dialog';
import Image from 'next/image';
import { useRef, useState } from 'react';

import type { SuitMedia } from '../../lib/types';
import { ProductVideo } from './product-video';

type Props = {
  name: string;
  /** Photos and videos, main photo first: a video is never the first thing to load (§5.2). */
  media: SuitMedia[];
};

// A small still for a thumbnail: the photo, or the video's poster.
function thumbUrl(item: SuitMedia) {
  if (item.kind === 'image') return shapedImageUrl(item.url, 'card');
  const cloud = cloudNameOf(item.url);
  return cloud ? videoPosterUrl(cloud, item.publicId, item.posterPublicId, 160) : null;
}

const SIZES = '(min-width: 64rem) 55vw, 100vw';

// The suit's photos, each shown whole on the page colour (docs/design.md §2): a swipe row with
// thumbnails on phones and tablets, a column beside the sticky details from lg. Tap to zoom.
export function SuitGallery({ name, media }: Props) {
  const photos = media.filter((m) => m.kind === 'image');
  const track = useRef<HTMLUListElement>(null);
  const [zoomed, setZoomed] = useState<SuitMedia | null>(null);
  const [current, setCurrent] = useState(0);

  const show = (index: number) => {
    const slide = track.current?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setCurrent(index);
  };

  // Keeps the thumbnails in step with a swipe.
  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (media.length === 0) {
    return (
      <div className="flex aspect-3/4 items-center justify-center bg-primary caps-tight text-primary-fg">
        Photo coming soon
      </div>
    );
  }

  return (
    <div>
      <ul
        ref={track}
        onScroll={onScroll}
        aria-label={`Photos of ${name}`}
        className="-mx-gutter flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-grid lg:overflow-visible"
      >
        {media.map((item, i) => (
          <li key={item.id} className="w-full shrink-0 snap-start">
            {item.kind === 'video' ? (
              <div className="flex aspect-3/4 items-center justify-center bg-bg lg:aspect-auto">
                <ProductVideo video={item} className="h-full lg:h-auto lg:w-full" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setZoomed(item)}
                aria-label={`Zoom photo ${photos.indexOf(item) + 1} of ${photos.length}`}
                className="relative block aspect-3/4 w-full cursor-zoom-in bg-bg"
              >
                <Image
                  src={shapedImageUrl(item.url, 'whole')}
                  alt={item.alt}
                  fill
                  sizes={SIZES}
                  priority={i === 0}
                  className="object-contain"
                />
              </button>
            )}
          </li>
        ))}
      </ul>

      {media.length > 1 && (
        <div
          className="mt-3 flex gap-2 lg:hidden"
          role="group"
          aria-label="Choose a photo or video"
        >
          {media.map((item, i) => {
            const thumb = thumbUrl(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => show(i)}
                aria-label={`Show ${item.kind === 'video' ? 'the video' : 'photo'} (${i + 1} of ${media.length})`}
                aria-current={current === i}
                className="relative size-14 overflow-hidden rounded-sm border border-border bg-primary aria-[current=true]:border-fg"
              >
                {thumb && (
                  <Image src={thumb} alt="" fill sizes="56px" className="object-cover object-top" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={zoomed !== null}
        onClose={() => setZoomed(null)}
        title={name}
        className="h-dvh max-h-none w-full! max-w-none! rounded-none"
      >
        {zoomed && (
          <div className="relative h-[calc(100dvh-8rem)] w-full">
            <Image
              src={shapedImageUrl(zoomed.url, 'whole')}
              alt={zoomed.alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}
