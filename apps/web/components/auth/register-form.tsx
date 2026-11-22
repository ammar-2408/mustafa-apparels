'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
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
import { AccountIcon, LockIcon, MailIcon } from '../site/icons';
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
    <form
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-[clamp(0.75rem,2svh,1.5rem)]"
    >
      <div className="grid gap-[clamp(0.75rem,2svh,1.5rem)] sm:grid-cols-2">
        <Input
          look="card"
          icon={<AccountIcon />}
          label="Full Name"
          name="name"
          autoComplete="name"
          placeholder="Enter your full name"
          required
          error={fieldErrors.name?.[0]}
        />
        <Input
          look="card"
          icon={<MailIcon />}
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          required
          error={fieldErrors.email?.[0]}
        />
      </div>
      <Input
        look="card"
        icon={<LockIcon />}
        revealable
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Create a password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters. A few unrelated words make a strong one.`}
        error={fieldErrors.password?.[0]}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordStrengthMeter password={password} />
      <FormError message={formError} />
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
