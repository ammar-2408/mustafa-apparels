'use client';

import { Button } from '@mustafa/ui/button';
import { Input } from '@mustafa/ui/input';
import {
  AUTH_MESSAGES,
  authErrorMessage,
  fieldErrorsOf,
  forgotPasswordInput,
} from '@mustafa/validators/auth';
import { type FormEvent, useState } from 'react';

import { authClient } from '../../lib/auth-client';
import { FormError } from './form-error';

// The answer never says whether the email has an account.
export function ForgotPasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordInput.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    setFormError('');
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: '/reset-password',
    });
    setPending(false);
    if (error?.status === 429) {
      setFormError(authErrorMessage(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p role="status" className="text-body-lg">
        {AUTH_MESSAGES.resetSent}
      </p>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldErrors.email?.[0]}
      />
      <FormError message={formError} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
