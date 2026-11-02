'use client';

import { Button } from '@mustafa/ui/button';
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
import { FormError } from './form-error';

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
    router.replace('/');
    router.refresh();
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
        className="self-start text-body underline underline-offset-4"
        onClick={() => {
          setBackup(!backup);
          setFieldError('');
          setFormError('');
        }}
      >
        {backup ? 'Use the code from your app' : 'Use a backup code instead'}
      </button>
      <Link href="/login" className="self-start text-body underline underline-offset-4">
        Start again
      </Link>
    </form>
  );
}
