'use client';

import { Button } from '@mustafa/ui/button';
import { Textarea } from '@mustafa/ui/textarea';
import Image from 'next/image';
import { type DragEvent, type ReactNode, useId, useRef, useState } from 'react';

import { addProductMedia } from '../app/(panel)/suits/[id]/actions';
import { ACCEPT, checkDuration, checkFile } from '../lib/file-check';
import { UploadError, uploadFile, videoDuration } from '../lib/upload';
import { type MediaItem, SavedMedia } from './saved-media';

type Pending = {
  key: string;
  name: string;
  kind: 'image' | 'video';
  previewUrl: string | null;
  // 0–1 while uploading.
  progress: number;
  publicId: string | null;
  alt: string;
  error: string;
  saving: boolean;
};

type MediaManagerProps = {
  productId: string;
  cloudName: string;
  media: MediaItem[];
  videoExtra?: (item: MediaItem) => ReactNode;
};

let counter = 0;

// Photos and videos of one suit: drop or choose files, each uploads at once and is saved when it
// has alt text. Saved items can be reordered, made main, described and deleted.
export function MediaManager({ productId, cloudName, media, videoExtra }: MediaManagerProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);

  const patch = (key: string, change: Partial<Pending>) =>
    setPending((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));
  const drop = (key: string) => {
    setPending((list) => {
      const item = list.find((p) => p.key === key);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return list.filter((p) => p.key !== key);
    });
  };

  async function start(file: File) {
    counter += 1;
    const key = `upload-${counter}`;
    const check = checkFile(file);
    const kind = check.ok ? check.kind : 'image';
    const item: Pending = {
      key,
      name: file.name,
      kind,
      previewUrl: check.ok && kind === 'image' ? URL.createObjectURL(file) : null,
      progress: 0,
      publicId: null,
      alt: '',
      error: check.ok ? '' : check.error,
      saving: false,
    };
    setPending((list) => [...list, item]);
    if (!check.ok) return;
    if (kind === 'video') {
      const tooLong = checkDuration(file.name, await videoDuration(file));
      if (tooLong) {
        patch(key, { error: tooLong });
        return;
      }
    }
    try {
      const publicId = await uploadFile(
        file,
        { kind, target: 'product', targetId: productId },
        (progress) => patch(key, { progress }),
      );
      patch(key, { publicId, progress: 1 });
    } catch (error) {
      patch(key, {
        error:
          error instanceof UploadError ? error.message : 'The upload failed. Please try again.',
      });
    }
  }

  function addFiles(files: FileList | null) {
    for (const file of Array.from(files ?? [])) void start(file);
    if (input.current) input.current.value = '';
  }

  async function save(item: Pending) {
    const alt = item.alt.trim();
    if (!item.publicId) return;
    if (alt.length < 3) {
      patch(item.key, { error: 'Add alt text first: describe the suit in a few words.' });
      return;
    }
    patch(item.key, { saving: true, error: '' });
    const result = await addProductMedia({
      productId,
      kind: item.kind,
      publicId: item.publicId,
      alt,
    });
    if (!result.ok) {
      const problems = result.error.fieldErrors?.file ?? result.error.fieldErrors?.alt;
      patch(item.key, { saving: false, error: problems?.join(' ') ?? result.error.message });
      // A refused file is gone from Cloudinary: it can't be saved again.
      if (result.error.fieldErrors?.file) patch(item.key, { publicId: null });
      return;
    }
    // The action revalidated this page: the saved list arrives with its answer.
    drop(item.key);
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  // A new key after each save or change remounts the saved list with the fresh order.
  const savedKey = media
    .map((m) => `${m.id}:${m.isPrimary}:${m.alt}:${m.posterPublicId}`)
    .join('|');

  return (
    <section aria-labelledby="media-heading" className="flex flex-col gap-6">
      <h2 id="media-heading" className="text-h3 font-light">
        Photos and videos
      </h2>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed p-6 text-center ${
          dragging ? 'border-action bg-primary' : 'border-border-strong'
        }`}
      >
        <span className="caps-tight">Add photos or videos</span>
        <span className="text-small text-muted">
          Drop files here or choose them. Photos: JPEG, PNG or WebP, up to 10 MB. Videos: MP4, MOV
          or WebM, up to 50 MB and 60 seconds, with no sound.
        </span>
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT.any}
        className="sr-only"
        onChange={(event) => addFiles(event.target.files)}
      />

      {pending.length > 0 ? (
        <ul aria-label="New uploads" className="flex flex-col gap-3">
          {pending.map((item) => (
            <li key={item.key} className="flex gap-3 rounded-sm border border-border p-3">
              <div className="flex aspect-[3/4] w-20 shrink-0 items-center justify-center rounded-sm bg-border">
                {item.previewUrl ? (
                  <Image
                    src={item.previewUrl}
                    alt=""
                    width={80}
                    height={107}
                    unoptimized
                    className="aspect-[3/4] w-20 rounded-sm object-cover"
                  />
                ) : (
                  <span className="caps-tight">{item.kind === 'video' ? 'Video' : 'File'}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate text-small">{item.name}</p>
                {item.error ? (
                  <p role="alert" className="text-small text-error">
                    {item.error}
                  </p>
                ) : null}
                {!item.error || item.publicId ? (
                  <>
                    {item.publicId ? null : (
                      <progress
                        className="w-full accent-action"
                        max={1}
                        value={item.progress}
                        aria-label={`Uploading ${item.name}`}
                      />
                    )}
                    <Textarea
                      label="Alt text"
                      rows={2}
                      maxLength={200}
                      showCount
                      value={item.alt}
                      onChange={(event) => patch(item.key, { alt: event.target.value })}
                      hint="Colour, pieces, print or work. Never a person or a brand."
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button disabled={!item.publicId || item.saving} onClick={() => save(item)}>
                        {item.saving
                          ? 'Saving…'
                          : item.publicId
                            ? `Save ${item.kind === 'video' ? 'video' : 'photo'}`
                            : 'Uploading…'}
                      </Button>
                      <Button variant="secondary" onClick={() => drop(item.key)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => drop(item.key)}>
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <SavedMedia
        key={savedKey}
        productId={productId}
        cloudName={cloudName}
        items={media}
        {...(videoExtra && { videoExtra })}
      />
    </section>
  );
}
