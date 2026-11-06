'use client';

import type { ActionResult } from '@mustafa/core/action-result';
import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { Textarea } from '@mustafa/ui/textarea';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import { categoryInput, categoryUpdateInput } from '@mustafa/validators/category';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { createCategory, updateCategory } from '../app/(panel)/collections/actions';
import { slugify } from '../lib/slugify';

export type CollectionValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type CollectionFormProps = { collection?: CollectionValues };

const text = (form: FormData, key: string) => String(form.get(key) ?? '');

// Create when there is no collection yet, edit otherwise. The slug follows the name until the
// owner types one; renaming a live collection keeps its old address working (a redirect).
export function CollectionForm({ collection }: CollectionFormProps) {
  const router = useRouter();
  const [name, setName] = useState(collection?.name ?? '');
  const [slug, setSlug] = useState(collection?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(collection));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      name: text(form, 'name'),
      slug: text(form, 'slug'),
      description: text(form, 'description'),
      seoTitle: text(form, 'seoTitle'),
      seoDescription: text(form, 'seoDescription'),
    };
    const input = collection ? { id: collection.id, ...values } : values;
    const parsed = (collection ? categoryUpdateInput : categoryInput).safeParse(input);
    setFormError('');
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const result: ActionResult<unknown> = collection
      ? await updateCategory(input)
      : await createCategory(input);
    setPending(false);
    if (!result.ok) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    // No refresh() after a move: it re-renders the old page and can cancel the move (Next 16.4.5).
    router.push('/collections');
  }

  const error = (key: string) => fieldErrors[key]?.[0];

  return (
    <form noValidate onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <Input
        label="Name"
        name="name"
        required
        maxLength={60}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (!slugEdited) setSlug(slugify(event.target.value));
        }}
        error={error('name')}
      />
      <Input
        label="Web address"
        name="slug"
        required
        maxLength={140}
        value={slug}
        hint={
          collection
            ? `mustafaapparels.com/collections/${slug || '…'}. Changing it keeps the old address working.`
            : `mustafaapparels.com/collections/${slug || '…'}`
        }
        onChange={(event) => {
          setSlugEdited(true);
          setSlug(event.target.value);
        }}
        error={error('slug')}
      />
      <Textarea
        label="Description"
        name="description"
        maxLength={2000}
        rows={5}
        defaultValue={collection?.description ?? ''}
        hint="Shown at the top of the collection page."
        error={error('description')}
      />
      <Input
        label="Search title"
        name="seoTitle"
        maxLength={70}
        defaultValue={collection?.seoTitle ?? ''}
        hint="Optional. Up to 70 characters; the name is used when empty."
        error={error('seoTitle')}
      />
      <Textarea
        label="Search description"
        name="seoDescription"
        maxLength={160}
        rows={3}
        showCount
        defaultValue={collection?.seoDescription ?? ''}
        hint="Optional. Up to 160 characters; the description is used when empty."
        error={error('seoDescription')}
      />
      <FormError message={formError} />
      <div className="flex flex-wrap gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : collection ? 'Save changes' : 'Create collection'}
        </Button>
        <Button variant="secondary" onClick={() => router.push('/collections')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
