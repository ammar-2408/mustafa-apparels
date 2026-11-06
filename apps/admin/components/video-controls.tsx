'use client';

import { videoDeliveryUrl, videoPosterUrl } from '@mustafa/core/media-url';
import { FormError } from '@mustafa/ui/form-error';
import { useId, useRef, useState } from 'react';

import { setVideoPoster } from '../app/(panel)/suits/[id]/actions';
import { ACCEPT, checkFile } from '../lib/file-check';
import { UploadError, uploadFile } from '../lib/upload';

type VideoControlsProps = {
  productId: string;
  mediaId: string;
  publicId: string;
  posterPublicId: string | null;
  cloudName: string;
};

const linkButton = 'caps-tight min-h-11 underline-offset-4 hover:underline disabled:opacity-40';

// Under a saved video: play the silent 720 px version the shop shows, and choose its poster (a
// photo the owner uploads, or the first frame). The page refreshes with the action's answer.
export function VideoControls({
  productId,
  mediaId,
  publicId,
  posterPublicId,
  cloudName,
}: VideoControlsProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(nextPoster: string | null) {
    const result = await setVideoPoster({ mediaId, posterPublicId: nextPoster });
    if (!result.ok) setError(result.error.fieldErrors?.file?.join(' ') ?? result.error.message);
  }

  async function choosePoster(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    setError('');
    const check = checkFile(file, ['image']);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadFile(file, {
        kind: 'image',
        target: 'product',
        targetId: productId,
        purpose: 'poster',
      });
      await save(uploaded);
    } catch (failure) {
      setError(
        failure instanceof UploadError ? failure.message : 'The upload failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function useFirstFrame() {
    setError('');
    setBusy(true);
    await save(null);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {playing ? (
        // Muted and inline, as on the shop (docs/design.md §5.2); the delivery version has no sound.
        <video
          src={videoDeliveryUrl(cloudName, publicId)}
          poster={videoPosterUrl(cloudName, publicId, posterPublicId)}
          muted
          playsInline
          controls
          preload="none"
          aria-label="Video preview"
          className="aspect-[3/4] w-full max-w-60 rounded-sm bg-border object-cover"
        />
      ) : null}
      <FormError message={error} />
      <div className="flex flex-wrap gap-x-4">
        <button type="button" className={linkButton} onClick={() => setPlaying((value) => !value)}>
          {playing ? 'Hide preview' : 'Play preview'}
        </button>
        <label
          htmlFor={inputId}
          className={`${linkButton} inline-flex cursor-pointer items-center`}
        >
          {busy ? 'Saving poster…' : 'Change poster'}
        </label>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={ACCEPT.image}
          className="sr-only"
          disabled={busy}
          onChange={(event) => choosePoster(event.target.files?.[0])}
        />
        {posterPublicId ? (
          <button type="button" className={linkButton} disabled={busy} onClick={useFirstFrame}>
            Use first frame
          </button>
        ) : null}
      </div>
      <p className="text-small text-muted">
        {posterPublicId ? 'Poster: your photo.' : 'Poster: the first frame of the video.'}
      </p>
    </div>
  );
}
