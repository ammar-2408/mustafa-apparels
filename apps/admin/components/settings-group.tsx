'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { Textarea } from '@mustafa/ui/textarea';
import { type FormEvent, useState } from 'react';

import { updateSiteSettings } from '../app/(panel)/settings/actions';

// One input of a group. `part` names a field inside an object setting (socials, default SEO).
export type SettingField = {
  key: string;
  part?: string;
  label: string;
  kind: 'text' | 'textarea';
  hint?: string;
  maxLength?: number;
  type?: 'tel' | 'email' | 'url';
};

type SettingsGroupProps = {
  title: string;
  description?: string;
  fields: SettingField[];
  // The stored values by key (null when the owner hasn't filled it in yet).
  values: Record<string, unknown>;
};

const inputName = (field: SettingField) => (field.part ? `${field.key}.${field.part}` : field.key);

const initialText = (field: SettingField, values: Record<string, unknown>) => {
  const value = values[field.key];
  if (field.part) return String((value as Record<string, unknown> | null)?.[field.part] ?? '');
  return value === null || value === undefined ? '' : String(value);
};

// The value to save for one key, or undefined when there's nothing new to save.
function valueFor(key: string, fields: SettingField[], form: FormData, stored: unknown) {
  const own = fields.filter((f) => f.key === key);
  if (own.some((f) => f.part)) {
    const entries = own
      .map((f) => [f.part!, String(form.get(inputName(f)) ?? '').trim()] as const)
      .filter(([, text]) => text !== '');
    if (entries.length === 0 && stored === null) return undefined;
    const value = Object.fromEntries(entries);
    return JSON.stringify(value) === JSON.stringify(stored ?? {}) ? undefined : value;
  }
  const text = String(form.get(key) ?? '').trim();
  if (text === '' && stored === null) return undefined;
  return text === String(stored ?? '') ? undefined : text;
}

// A small form for related settings. Save sends only the keys that changed, one at a time, and
// shows each key's problem under its field.
export function SettingsGroup({ title, description, fields, values }: SettingsGroupProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState(false);
  const keys = [...new Set(fields.map((f) => f.key))];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFormError('');
    setSaved('');
    const nextErrors: Record<string, string> = {};
    let changed = 0;
    for (const key of keys) {
      const value = valueFor(key, fields, form, values[key] ?? null);
      if (value === undefined) continue;
      changed += 1;
      const result = await updateSiteSettings({ key, value });
      if (!result.ok) {
        const messages = Object.values(result.error.fieldErrors ?? {}).flat();
        nextErrors[key] = messages.join(' ') || result.error.message;
      }
    }
    setPending(false);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0)
      setFormError('Some changes were not saved. See the highlighted fields.');
    else setSaved(changed === 0 ? 'Nothing changed.' : 'Saved.');
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={`settings-${title}`}
      className="flex flex-col gap-5 rounded-sm border border-border p-4"
    >
      <h2 id={`settings-${title}`} className="text-h3 font-light">
        {title}
      </h2>
      {description ? <p className="-mt-3 text-small text-muted">{description}</p> : null}
      {fields.map((field) => {
        const common = {
          name: inputName(field),
          label: field.label,
          hint: field.hint,
          maxLength: field.maxLength,
          defaultValue: initialText(field, values),
          // An object setting's problem shows once, under its first field.
          error: fields.find((f) => f.key === field.key) === field ? errors[field.key] : undefined,
        };
        return field.kind === 'textarea' ? (
          <Textarea
            key={inputName(field)}
            {...common}
            rows={4}
            showCount={Boolean(field.maxLength && field.maxLength <= 200)}
          />
        ) : (
          <Input key={inputName(field)} {...common} type={field.type ?? 'text'} />
        );
      })}
      <FormError message={formError} />
      <p role="status" className="text-small text-success empty:hidden">
        {saved}
      </p>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : `Save ${title.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
