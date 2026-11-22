'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { authErrorMessage, fieldErrorsOf, signInInput } from '@mustafa/validators/auth';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authClient } from '../../lib/auth-client';
import { LockIcon, MailIcon } from '../site/icons';

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
    // /account renders per request, so it reads the new session cookie; a refresh() here would
    // re-render /login instead and can cancel the move.
    router.replace('/account');
  }

  return (
    <form
      method="post"
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-[clamp(0.75rem,2svh,1.5rem)]"
    >
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
      <Input
        look="card"
        icon={<LockIcon />}
        revealable
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
        error={fieldErrors.password?.[0]}
      />
      <FormError message={formError} />
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
