'use client';

import { Button } from '@mustafa/ui/button';
import { Input } from '@mustafa/ui/input';
import {
  authErrorMessage,
  fieldErrorsOf,
  PASSWORD_MAX,
  PASSWORD_MIN,
  signUpInput,
} from '@mustafa/validators/auth';
import { type FormEvent, useState } from 'react';

import { authClient } from '../../lib/auth-client';
import { FormError } from './form-error';
import { PasswordStrengthMeter } from './password-strength-meter';

// The answer is the same whether or not the email already has an account.
export const CHECK_EMAIL =
  'Check your email. We’ve sent a link to finish creating your account. It can take a few minutes to arrive.';

export function RegisterForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpInput.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    setFormError('');
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await authClient.signUp.email({ ...parsed.data, callbackURL: '/account' });
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p role="status" className="text-body-lg">
        {CHECK_EMAIL}
      </p>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Input label="Name" name="name" autoComplete="name" required error={fieldErrors.name?.[0]} />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldErrors.email?.[0]}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters. A few unrelated words make a strong one.`}
        error={fieldErrors.password?.[0]}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordStrengthMeter password={password} />
      <FormError message={formError} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
