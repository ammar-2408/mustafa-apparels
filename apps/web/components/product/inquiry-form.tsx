'use client';

import type { ActionResult } from '@mustafa/core/action-result';
import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { Textarea } from '@mustafa/ui/textarea';
import { fieldErrorsOf } from '@mustafa/validators/auth';
import { inquiryInput } from '@mustafa/validators/inquiry';
import { type FormEvent, useEffect, useRef, useState } from 'react';

type Props = {
  productId: string;
  suitName: string;
  submit: (raw: unknown) => Promise<ActionResult<{ inquiryId: string | null }>>;
};

export const THANK_YOU =
  'Thank you. We have your question and will reply by WhatsApp, phone or email, whichever you gave us.';

// The optional form under the contact buttons (docs/prd.md W5): for shoppers who'd rather write
// than chat. A phone or an email is needed so we can reply. The hidden `website` field is a trap
// for bots, and `startedAt` lets the server refuse forms sent faster than a person could.
export function InquiryForm({ productId, suitName, submit }: Props) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef(0);

  // Set in the browser, so a page cached for hours still counts from when the shopper saw it.
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      startedAt: String(startedAt.current),
    };
    setFormError('');
    const parsed = inquiryInput.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const result = await submit(values);
    setPending(false);
    if (!result.ok) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p role="status" className="text-body-lg">
        {THANK_YOU}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      aria-label={`Ask about ${suitName}`}
    >
      <input type="hidden" name="productId" value={productId} />
      {/* Hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Input label="Name" name="name" autoComplete="name" required error={fieldErrors.name?.[0]} />
      <Input
        label="Phone or WhatsApp"
        name="phone"
        type="tel"
        autoComplete="tel"
        hint="A Pakistani mobile number, such as 0300 1234567. Or give an email below."
        error={fieldErrors.phone?.[0]}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email?.[0]}
      />
      <Textarea
        label="Your question"
        name="message"
        required
        maxLength={2000}
        rows={4}
        showCount
        error={fieldErrors.message?.[0]}
      />
      <FormError message={formError} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Sending…' : 'Send question'}
      </Button>
    </form>
  );
}
