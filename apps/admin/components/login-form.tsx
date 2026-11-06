'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { authErrorMessage, fieldErrorsOf, signInInput } from '@mustafa/validators/auth';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authClient } from '../lib/auth-client';

export function LoginForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signInInput.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    setFormError('');
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { data, error } = await authClient.signIn.email(parsed.data);
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    // With 2FA on, no session exists yet: the code comes next. Without it, setup comes first.
    const next = data && 'twoFactorRedirect' in data && data.twoFactorRedirect;
    // No refresh() after a move: it re-renders the old page and can cancel the move (Next 16.4.5).
    router.replace(next ? '/login/verify' : '/setup-2fa');
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        error={fieldErrors.email?.[0]}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors.password?.[0]}
      />
      <FormError message={formError} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
