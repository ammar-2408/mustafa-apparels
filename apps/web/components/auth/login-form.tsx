'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { authErrorMessage, fieldErrorsOf, signInInput } from '@mustafa/validators/auth';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authClient } from '../../lib/auth-client';

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
    const { error } = await authClient.signIn.email(parsed.data);
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace('/account');
    router.refresh();
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
