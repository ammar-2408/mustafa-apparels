'use client';

import { shapedImageUrl } from '@mustafa/core/media-url';
import { Dialog } from '@mustafa/ui/dialog';
import Image from 'next/image';
import { type ReactNode, useRef, useState } from 'react';

import type { SuitMedia } from '../../lib/types';

type Props = {
  name: string;
  photos: SuitMedia[];
  /** Shown after the main photo, so a video is never the first thing to load (§5.2). */
  afterMain?: ReactNode;
};

const SIZES = '(min-width: 64rem) 55vw, 100vw';

// The suit's photos, each shown whole on the page colour (docs/design.md §2): a swipe row with
// thumbnails on phones and tablets, a column beside the sticky details from lg. Tap to zoom.
export function SuitGallery({ name, photos, afterMain }: Props) {
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

  if (photos.length === 0) {
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
        {photos.map((photo, i) => (
          <li key={photo.id} className="w-full shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setZoomed(photo)}
              aria-label={`Zoom photo ${i + 1} of ${photos.length}`}
              className="relative block aspect-3/4 w-full cursor-zoom-in bg-bg"
            >
              <Image
                src={shapedImageUrl(photo.url, 'whole')}
                alt={photo.alt}
                fill
                sizes={SIZES}
                priority={i === 0}
                className="object-contain"
              />
            </button>
            {i === 0 && afterMain}
          </li>
        ))}
      </ul>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 lg:hidden" role="group" aria-label="Choose a photo">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => show(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={current === i}
              className="relative size-14 overflow-hidden rounded-sm border border-border aria-[current=true]:border-fg"
            >
              <Image
                src={shapedImageUrl(photo.url, 'card')}
                alt=""
                fill
                sizes="56px"
                className="object-cover object-top"
              />
            </button>
          ))}
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
