'use client';

import { Button } from '@mustafa/ui/button';
import { Input } from '@mustafa/ui/input';
import {
  authErrorMessage,
  fieldErrorsOf,
  PASSWORD_MAX,
  PASSWORD_MIN,
  resetPasswordInput,
} from '@mustafa/validators/auth';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { authClient } from '../../lib/auth-client';
import { FormError } from './form-error';
import { PasswordStrengthMeter } from './password-strength-meter';

export const PASSWORD_CHANGED =
  'Your password is changed, and you’ve been logged out everywhere. Log in with the new one.';

export function ResetPasswordForm({ token }: { token: string }) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = resetPasswordInput.safeParse({ ...form, token });
    setFormError('');
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await authClient.resetPassword(parsed.data);
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-6 text-body-lg">
        <p>{PASSWORD_CHANGED}</p>
        <Link href="/login" className="link">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Input
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters. A few unrelated words make a strong one.`}
        error={fieldErrors.newPassword?.[0]}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordStrengthMeter password={password} />
      <FormError message={formError} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}
