'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import { setCategoryImage } from '../app/(panel)/collections/actions';
import { imageThumbUrl } from '../lib/cloudinary-url';
import { ACCEPT, checkFile } from '../lib/file-check';
import { UploadError, uploadFile } from '../lib/upload';

type CollectionImageProps = {
  collectionId: string;
  name: string;
  cloudName: string;
  publicId: string | null;
};

// One photo for the collection's tile and page header. It replaces the old one on save.
export function CollectionImage({ collectionId, name, cloudName, publicId }: CollectionImageProps) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function choose(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    setError('');
    const check = checkFile(file, ['image']);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    try {
      setProgress(0);
      const uploaded = await uploadFile(
        file,
        { kind: 'image', target: 'category', targetId: collectionId },
        setProgress,
      );
      const result = await setCategoryImage({ id: collectionId, publicId: uploaded });
      if (!result.ok) {
        setError(result.error.fieldErrors?.file?.join(' ') ?? result.error.message);
        return;
      }
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof UploadError ? failure.message : 'The upload failed. Please try again.',
      );
    } finally {
      setProgress(null);
    }
  }

  async function remove() {
    setError('');
    const result = await setCategoryImage({ id: collectionId, publicId: null });
    if (!result.ok) setError(result.error.message);
    else router.refresh();
  }

  return (
    <section aria-labelledby="collection-image" className="flex max-w-2xl flex-col gap-4">
      <h2 id="collection-image" className="text-h3 font-light">
        Collection photo
      </h2>
      {publicId ? (
        <Image
          src={imageThumbUrl(cloudName, publicId, 480)}
          alt={`${name} collection`}
          width={240}
          height={320}
          unoptimized
          className="aspect-[3/4] w-40 rounded-sm bg-border object-cover"
        />
      ) : (
        <p className="text-body text-muted">No photo yet. JPEG, PNG or WebP, up to 10 MB.</p>
      )}
      {progress !== null ? (
        <progress
          className="w-full accent-action"
          max={1}
          value={progress}
          aria-label="Uploading the photo"
        />
      ) : null}
      <FormError message={error} />
      <div className="flex flex-wrap gap-4">
        <label
          htmlFor={inputId}
          className="caps-tight inline-flex min-h-12 cursor-pointer items-center rounded-sm border border-action px-6"
        >
          {publicId ? 'Replace photo' : 'Add photo'}
        </label>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={ACCEPT.image}
          className="sr-only"
          onChange={(event) => choose(event.target.files?.[0])}
        />
        {publicId ? (
          <Button variant="secondary" onClick={remove}>
            Remove photo
          </Button>
        ) : null}
      </div>
    </section>
  );
}
