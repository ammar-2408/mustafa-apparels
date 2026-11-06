'use client';

import { Button } from '@mustafa/ui/button';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import {
  authErrorMessage,
  backupCodeInput,
  fieldErrorsOf,
  totpCodeInput,
} from '@mustafa/validators/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authClient } from '../lib/auth-client';

// The second step of every admin login: a code from the app, or one backup code.
export function VerifyCodeForm() {
  const router = useRouter();
  const [backup, setBackup] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = (backup ? backupCodeInput : totpCodeInput).safeParse(form);
    setFormError('');
    if (!parsed.success) {
      setFieldError(fieldErrorsOf(parsed.error).code?.[0] ?? '');
      return;
    }
    setFieldError('');
    setPending(true);
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code: parsed.data.code })
      : await authClient.twoFactor.verifyTotp({ code: parsed.data.code });
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    // No refresh() after a move: it re-renders the old page and can cancel the move (Next 16.4.5).
    router.replace('/');
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Input
        key={backup ? 'backup' : 'app'}
        label={backup ? 'Backup code' : 'Code from your app'}
        name="code"
        autoComplete="one-time-code"
        inputMode={backup ? 'text' : 'numeric'}
        required
        error={fieldError}
      />
      <FormError message={formError} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Checking…' : 'Continue'}
      </Button>
      <button
        type="button"
        className="link self-start text-body"
        onClick={() => {
          setBackup(!backup);
          setFieldError('');
          setFormError('');
        }}
      >
        {backup ? 'Use the code from your app' : 'Use a backup code instead'}
      </button>
      <Link href="/login" className="link self-start text-body">
        Start again
      </Link>
    </form>
  );
}
