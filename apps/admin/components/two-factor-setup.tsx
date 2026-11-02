'use client';

import { Button } from '@mustafa/ui/button';
import { Input } from '@mustafa/ui/input';
import { authErrorMessage, fieldErrorsOf, totpCodeInput } from '@mustafa/validators/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import type { TwoFactorSetup as Setup } from '../app/(auth)/setup-2fa/actions';
import { startTwoFactorSetup } from '../app/(auth)/setup-2fa/actions';
import { authClient } from '../lib/auth-client';
import { FormError } from './form-error';

// Forced on the first admin login: password, then scan the code and save the backup codes,
// then prove it works with one code. The backup codes are shown this once only.
export function TwoFactorSetup() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await startTwoFactorSetup(Object.fromEntries(new FormData(event.currentTarget)));
    setPending(false);
    if (!result.ok) {
      setFieldError(result.error.fieldErrors?.password?.[0] ?? '');
      setFormError(result.error.fieldErrors ? '' : result.error.message);
      return;
    }
    setFieldError('');
    setFormError('');
    setSetup(result.data);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = totpCodeInput.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    setFormError('');
    if (!parsed.success) {
      setFieldError(fieldErrorsOf(parsed.error).code?.[0] ?? '');
      return;
    }
    setFieldError('');
    setPending(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: parsed.data.code });
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace('/');
    router.refresh();
  }

  if (!setup) {
    return (
      <form noValidate onSubmit={start} className="flex flex-col gap-6">
        <Input
          label="Your password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={fieldError}
        />
        <FormError message={formError} />
        <Button type="submit" disabled={pending}>
          {pending ? 'Checking…' : 'Continue'}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-light">1. Scan this code</h2>
        <p className="text-body">
          Use an authenticator app such as Google Authenticator, Microsoft Authenticator or
          1Password.
        </p>
        {/* A data URL made on the server, so there's nothing to optimise. */}
        <Image
          src={setup.qr}
          unoptimized
          alt="QR code to add Mustafa Apparels Admin to your authenticator app"
          width={240}
          height={240}
          className="h-60 w-60 border border-border"
        />
        <p className="text-small text-muted">
          Can’t scan it? Enter this key by hand:{' '}
          <code data-testid="totp-secret" className="break-all text-fg">
            {setup.secret}
          </code>
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-light">2. Save your backup codes</h2>
        <p className="text-body">
          Each one works once, if you lose your phone. Keep them somewhere safe, such as a password
          manager. They won’t be shown again.
        </p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-body" aria-label="Backup codes">
          {setup.backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </section>

      <form noValidate onSubmit={confirm} className="flex flex-col gap-6">
        <h2 className="text-h3 font-light">3. Enter a code to finish</h2>
        <Input
          label="Code from your app"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          required
          error={fieldError}
        />
        <FormError message={formError} />
        <Button type="submit" disabled={pending}>
          {pending ? 'Checking…' : 'Turn on 2FA'}
        </Button>
      </form>
    </div>
  );
}
