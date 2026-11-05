'use client';

import { Button } from '@mustafa/ui/button';
import { Dialog } from '@mustafa/ui/dialog';
import { FormError } from '@mustafa/ui/form-error';
import { Textarea } from '@mustafa/ui/textarea';
import Image from 'next/image';
import { type ReactNode, useState } from 'react';

import {
  deleteProductMedia,
  reorderProductMedia,
  setPrimaryProductImage,
  updateMediaAlt,
} from '../app/(panel)/suits/[id]/actions';
import { imageThumbUrl, videoPosterUrl } from '../lib/cloudinary-url';
import { SortableList } from './sortable-list';
import { VideoControls } from './video-controls';

// Stock from scripts/import-stock.ts. Its files are shared with the other database, so deleting
// one here keeps the file (the same prefix as IMPORTED_PREFIX in core, which can't load here).
const IMPORTED_PREFIX = 'products/imported/';

export type MediaItem = {
  id: string;
  kind: 'image' | 'video';
  publicId: string;
  alt: string;
  isPrimary: boolean;
  posterPublicId: string | null;
  durationSeconds: number | null;
};

// The rule core.media keeps: the first photo in the order is the main image.
const withMain = (list: MediaItem[]) => {
  const main = list.find((item) => item.kind === 'image')?.id;
  return list.map((item) => ({ ...item, isPrimary: item.id === main }));
};

type Result = { ok: boolean; error?: { message: string; fieldErrors?: Record<string, string[]> } };

type SavedMediaProps = {
  productId: string;
  cloudName: string;
  items: MediaItem[];
};

// The saved photos and videos, in storefront order. The first photo is the main image. The
// actions revalidate this page, so fresh props arrive with each answer and remount the list.
export function SavedMedia({ productId, cloudName, items }: SavedMediaProps) {
  const [order, setOrder] = useState(items);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<MediaItem | null>(null);

  const run = async (action: () => Promise<Result>) => {
    setPending(true);
    setError('');
    const result = await action();
    setPending(false);
    if (!result.ok) {
      // The specific reason when there is one (e.g. the last photo of a published suit).
      const reasons = Object.values(result.error?.fieldErrors ?? {}).flat();
      setError(
        reasons.length > 0
          ? reasons.join(' ')
          : (result.error?.message ?? 'Something went wrong. Please try again.'),
      );
      setOrder(items);
      return false;
    }
    return true;
  };

  if (order.length === 0) {
    return (
      <p className="text-body text-muted">
        No photos yet. A suit needs at least one photo, with alt text, before it can be published.
      </p>
    );
  }

  return (
    <>
      <FormError message={error} />
      <SortableList
        items={order}
        disabled={pending}
        className="grid gap-3 xl:grid-cols-2"
        labelOf={(item) => labelOf(item, order)}
        onReorder={(ids) => {
          const byId = new Map(order.map((item) => [item.id, item]));
          setOrder(withMain(ids.flatMap((id) => byId.get(id) ?? [])));
          void run(() => reorderProductMedia({ productId, mediaIds: ids }));
        }}
        renderItem={(item) => (
          <MediaCard
            item={item}
            cloudName={cloudName}
            disabled={pending}
            onMakeMain={() => {
              setOrder(withMain([item, ...order.filter((other) => other.id !== item.id)]));
              return run(() => setPrimaryProductImage({ productId, mediaId: item.id }));
            }}
            onSaveAlt={(alt) => run(() => updateMediaAlt({ mediaId: item.id, alt }))}
            onDelete={() => setConfirming(item)}
            extra={
              item.kind === 'video' ? (
                <VideoControls
                  productId={productId}
                  mediaId={item.id}
                  publicId={item.publicId}
                  posterPublicId={item.posterPublicId}
                  cloudName={cloudName}
                />
              ) : null
            }
          />
        )}
      />
      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming?.kind === 'video' ? 'Delete this video?' : 'Delete this photo?'}
      >
        <p className="mb-6 text-body">
          {confirming?.publicId.startsWith(IMPORTED_PREFIX)
            ? 'It is removed from this suit. It came from the stock import, so the file itself stays in Cloudinary, where the other database may use it. If it must not be online at all, delete it in the Cloudinary console too.'
            : 'It is removed from the suit and from Cloudinary. This can’t be undone.'}
        </p>
        <div className="flex flex-wrap gap-4">
          <Button
            disabled={pending}
            onClick={async () => {
              const item = confirming;
              setConfirming(null);
              if (item) await run(() => deleteProductMedia({ mediaId: item.id }));
            }}
          >
            Delete
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </>
  );
}

// "Photo 2" / "Video 1": what screen readers call each card.
function labelOf(item: MediaItem, all: MediaItem[]) {
  const same = all.filter((other) => other.kind === item.kind);
  return `${item.kind === 'image' ? 'Photo' : 'Video'} ${same.indexOf(item) + 1}`;
}

type MediaCardProps = {
  item: MediaItem;
  cloudName: string;
  disabled: boolean;
  onMakeMain: () => Promise<boolean>;
  onSaveAlt: (alt: string) => Promise<boolean>;
  onDelete: () => void;
  extra: ReactNode;
};

function MediaCard({
  item,
  cloudName,
  disabled,
  onMakeMain,
  onSaveAlt,
  onDelete,
  extra,
}: MediaCardProps) {
  const [alt, setAlt] = useState(item.alt);
  const [altError, setAltError] = useState('');
  const src =
    item.kind === 'image'
      ? imageThumbUrl(cloudName, item.publicId)
      : videoPosterUrl(cloudName, item.publicId, item.posterPublicId, 320);

  const saveAlt = async () => {
    const value = alt.trim();
    if (value === item.alt) return;
    if (value.length < 3) {
      setAltError('Describe the photo in a few words (3–200 characters).');
      return;
    }
    setAltError('');
    await onSaveAlt(value);
  };

  return (
    <div className="flex gap-3">
      <div className="relative w-24 shrink-0">
        <Image
          src={src}
          alt={item.alt}
          width={96}
          height={128}
          unoptimized
          className="aspect-[3/4] w-24 rounded-sm bg-border object-cover"
        />
        {item.isPrimary ? (
          <span className="caps-tight absolute top-1 left-1 rounded-sm bg-accent px-1.5 py-0.5 text-accent-fg">
            Main
          </span>
        ) : null}
        {item.kind === 'video' ? (
          <span className="caps-tight absolute bottom-1 left-1 rounded-sm bg-action px-1.5 py-0.5 text-action-fg">
            Video{item.durationSeconds ? ` ${Math.round(item.durationSeconds)}s` : ''}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Textarea
          label="Alt text"
          rows={2}
          maxLength={200}
          showCount
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          onBlur={saveAlt}
          error={altError}
          hint="Colour, pieces, print or work. Never a person or a brand."
        />
        <div className="flex flex-wrap gap-x-4">
          {item.kind === 'image' && !item.isPrimary ? (
            <button
              type="button"
              className="caps-tight min-h-11 underline-offset-4 hover:underline"
              disabled={disabled}
              onClick={onMakeMain}
            >
              Make main
            </button>
          ) : null}
          <button
            type="button"
            className="caps-tight min-h-11 text-error underline-offset-4 hover:underline"
            disabled={disabled}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
        {extra}
      </div>
    </div>
  );
}
