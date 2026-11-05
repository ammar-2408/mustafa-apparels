'use client';

import { Button } from '@mustafa/ui/button';
import { Checkbox } from '@mustafa/ui/checkbox';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { Select } from '@mustafa/ui/select';
import { Textarea } from '@mustafa/ui/textarea';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import { productCreateInput, productEditInput } from '@mustafa/validators/product';
import { useRouter } from 'next/navigation';
import { type FormEvent, Fragment, useState } from 'react';

import { createProduct, updateProduct } from '../app/(panel)/suits/actions';
import {
  type FieldConfig,
  type Option,
  PIECE_ROWS,
  PRODUCT_FIELDS,
  readProductForm,
  SECTIONS,
} from '../lib/product-fields';
import { slugify } from '../lib/slugify';

export type PieceDetail = { piece: string; fabric?: string; finish?: string; length_m?: number };

// The stored suit, as the form shows it.
export type ProductValues = Partial<Record<string, unknown>> & {
  id?: string;
  name?: string;
  slug?: string;
  designCode?: string | null;
  pieceDetails?: PieceDetail[];
};

type ProductFormProps = {
  collections: Option[];
  /** Missing: a new suit. Present: edit this one. */
  suit?: ProductValues & { id: string };
};

const asText = (value: unknown) =>
  value === null || value === undefined
    ? ''
    : Array.isArray(value)
      ? value.join(', ')
      : String(value);

// The suit form, drawn from lib/product-fields.ts in its sections. A new suit is saved as a draft
// and opens its edit page, where photos are added and it is published.
export function ProductForm({ collections, suit }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(suit?.name ?? '');
  const [designCode, setDesignCode] = useState(suit?.designCode ?? '');
  const [slug, setSlug] = useState(suit?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(suit));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState(false);

  const autoSlug = (nextName: string, nextCode: string) => {
    if (!slugEdited) setSlug(slugify(`${nextName} ${nextCode}`));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readProductForm(new FormData(event.currentTarget));
    const input = suit ? { id: suit.id, ...values } : values;
    const parsed = (suit ? productEditInput : productCreateInput).safeParse(input);
    setFormError('');
    setSaved('');
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      setFormError('Check the highlighted fields.');
      return;
    }
    setFieldErrors({});
    setPending(true);
    const result = suit ? await updateProduct(input) : await createProduct(input);
    setPending(false);
    if (!result.ok) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    if (suit) {
      setSaved('Changes saved.');
      router.refresh();
    } else {
      router.push(`/suits/${result.data.id}`);
    }
  }

  const error = (key: string) => fieldErrors[key]?.join(' ');

  const render = (field: FieldConfig) => {
    const common = {
      id: `field-${field.name}`,
      name: field.name,
      label: field.label,
      hint: field.hint,
      error: error(field.name),
    };
    const initial = suit?.[field.name];
    switch (field.name) {
      case 'name':
        return (
          <Input
            {...common}
            required
            maxLength={field.maxLength}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              autoSlug(event.target.value, designCode);
            }}
          />
        );
      case 'designCode':
        return (
          <Input
            {...common}
            maxLength={field.maxLength}
            value={designCode}
            onChange={(event) => {
              setDesignCode(event.target.value);
              autoSlug(name, event.target.value);
            }}
          />
        );
      case 'slug':
        return (
          <Input
            {...common}
            required
            maxLength={field.maxLength}
            value={slug}
            hint={`mustafaapparels.com/products/${slug || '…'}${suit ? '. Changing it keeps the old address working.' : ''}`}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
          />
        );
    }
    switch (field.kind) {
      case 'text':
      case 'tags':
        return <Input {...common} maxLength={field.maxLength} defaultValue={asText(initial)} />;
      case 'price':
        return <Input {...common} inputMode="numeric" defaultValue={asText(initial)} />;
      case 'textarea':
        return (
          <Textarea
            {...common}
            maxLength={field.maxLength}
            rows={field.maxLength && field.maxLength <= 200 ? 3 : 5}
            showCount={Boolean(field.maxLength && field.maxLength <= 200)}
            defaultValue={asText(initial)}
          />
        );
      case 'select':
        return (
          <Select
            {...common}
            options={field.options ?? []}
            {...(field.emptyLabel !== undefined && { placeholder: field.emptyLabel })}
            defaultValue={
              asText(initial) ||
              (field.emptyLabel !== undefined
                ? ''
                : (field.defaultValue ?? field.options?.[0]?.value))
            }
          />
        );
      case 'collection':
        return (
          <Select
            {...common}
            required
            options={collections}
            placeholder="Choose a collection"
            defaultValue={asText(initial)}
          />
        );
      case 'toggle':
        return (
          <Checkbox
            id={`field-${field.name}`}
            name={field.name}
            label={field.label}
            defaultChecked={initial === true}
          />
        );
      case 'checkboxes':
        return (
          <fieldset
            id={`field-${field.name}`}
            aria-describedby={error(field.name) ? `${field.name}-error` : undefined}
          >
            <legend className="mb-2 caps-tight">{field.label}</legend>
            {field.hint ? <p className="mb-2 text-small text-muted">{field.hint}</p> : null}
            <div className="grid gap-x-6 sm:grid-cols-2">
              {(field.options ?? []).map((option) => (
                <Checkbox
                  key={option.value}
                  name={field.name}
                  value={option.value}
                  label={option.label}
                  defaultChecked={Array.isArray(initial) && initial.includes(option.value)}
                />
              ))}
            </div>
            <p id={`${field.name}-error`} aria-live="polite" className="text-small text-error">
              {error(field.name)}
            </p>
          </fieldset>
        );
      case 'pieces':
        return (
          <PiecesField field={field} initial={suit?.pieceDetails ?? []} error={error(field.name)} />
        );
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-10">
      {SECTIONS.map((section) => (
        <fieldset key={section} className="flex flex-col gap-6">
          <legend className="mb-6 text-h3 font-light">{section}</legend>
          {PRODUCT_FIELDS.filter((field) => field.section === section).map((field) => (
            <Fragment key={field.name}>{render(field)}</Fragment>
          ))}
        </fieldset>
      ))}
      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-surface py-4">
        <FormError message={formError} />
        <p role="status" className="text-small text-success empty:hidden">
          {saved}
        </p>
        <div className="flex flex-wrap gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : suit ? 'Save changes' : 'Save as draft'}
          </Button>
          {suit ? null : (
            <Button variant="secondary" onClick={() => router.push('/suits')}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function PiecesField({
  field,
  initial,
  error,
}: {
  field: FieldConfig;
  initial: PieceDetail[];
  error?: string | undefined;
}) {
  return (
    <fieldset id="field-pieceDetails" aria-describedby={error ? 'pieces-error' : undefined}>
      <legend className="mb-2 caps-tight">{field.label}</legend>
      {field.hint ? <p className="mb-4 text-small text-muted">{field.hint}</p> : null}
      <div className="flex flex-col gap-4">
        {PIECE_ROWS.map(({ piece, label }) => {
          const row = initial.find((detail) => detail.piece === piece);
          return (
            <div
              key={piece}
              className="grid gap-3 rounded-sm border border-border p-3 sm:grid-cols-[8rem_1fr_1fr_7rem] sm:items-end"
            >
              <Checkbox
                name={`piece-${piece}`}
                label={label}
                defaultChecked={Boolean(row) || initial.length === 0}
              />
              <Input
                name={`piece-${piece}-fabric`}
                label={`${label} fabric`}
                maxLength={40}
                defaultValue={row?.fabric ?? ''}
              />
              <Input
                name={`piece-${piece}-finish`}
                label={`${label} finish`}
                maxLength={40}
                defaultValue={row?.finish ?? ''}
                hint="E.g. Embroidered, Printed, Plain dyed"
              />
              <Input
                name={`piece-${piece}-length`}
                label={`${label} length (m)`}
                inputMode="decimal"
                defaultValue={row?.length_m === undefined ? '' : String(row.length_m)}
              />
            </div>
          );
        })}
      </div>
      <p id="pieces-error" aria-live="polite" className="mt-2 text-small text-error">
        {error}
      </p>
    </fieldset>
  );
}
