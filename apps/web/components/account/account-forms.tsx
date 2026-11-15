'use client';

import type { ActionResult } from '@mustafa/core/action-result';
import { Button } from '@mustafa/ui/button';
import { Dialog } from '@mustafa/ui/dialog';
import { FormError } from '@mustafa/ui/form-error';
import { Input } from '@mustafa/ui/input';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authClient } from '../../lib/auth-client';

type Action<T> = (raw: unknown) => Promise<ActionResult<T>>;

function useActionForm<T>(action: Action<T>, onDone: (data: T) => void) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setPending(true);
    const result = await action(Object.fromEntries(new FormData(event.currentTarget)));
    setPending(false);
    if (!result.ok) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    setFieldErrors({});
    onDone(result.data);
  };
  return { fieldErrors, formError, pending, onSubmit };
}

export function ProfileForm({
  name,
  phone,
  save,
}: {
  name: string;
  phone: string | null;
  save: Action<{ name: string; phone: string | null }>;
}) {
  const [saved, setSaved] = useState('');
  const form = useActionForm(save, () => setSaved('Saved.'));
  return (
    <form
      method="post"
      noValidate
      onSubmit={form.onSubmit}
      className="flex max-w-md flex-col gap-6"
    >
      <Input
        label="Name"
        name="name"
        defaultValue={name}
        autoComplete="name"
        required
        error={form.fieldErrors.name?.[0]}
      />
      <Input
        label="Phone or WhatsApp"
        name="phone"
        type="tel"
        defaultValue={phone ?? ''}
        autoComplete="tel"
        hint="Optional. A Pakistani mobile number, such as 0300 1234567."
        error={form.fieldErrors.phone?.[0]}
      />
      <FormError message={form.formError} />
      <p role="status" className="text-body text-success">
        {saved}
      </p>
      <Button type="submit" variant="secondary" disabled={form.pending}>
        Save changes
      </Button>
    </form>
  );
}

export function SavedSuitRemove({
  productId,
  name,
  remove,
}: {
  productId: string;
  name: string;
  remove: Action<{ saved: boolean }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await remove({ productId, saved: false });
        setPending(false);
        if (result.ok) router.refresh();
      }}
      className="link min-h-11 py-2"
    >
      Remove <span className="sr-only">{name}</span>
    </button>
  );
}

export function SessionButtons() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        // Ends every session on every device, this one included.
        await authClient.revokeSessions();
        await authClient.signOut();
        router.replace('/login');
      }}
    >
      Log out everywhere
    </Button>
  );
}

export function DeleteAccount({ remove }: { remove: Action<{ deleted: boolean }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useActionForm(remove, () => router.replace('/?account=deleted'));
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      {open && (
        <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?">
          <form method="post" noValidate onSubmit={form.onSubmit} className="flex flex-col gap-6">
            <p className="text-body">
              This removes your account, your saved suits and your sign-in. Questions you sent stay
              with the shop, without your name or contact details. It can&rsquo;t be undone.
            </p>
            <Input
              label="Your password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              error={form.fieldErrors.password?.[0]}
            />
            <Input
              label="Type DELETE to confirm"
              name="confirm"
              autoComplete="off"
              required
              error={form.fieldErrors.confirm?.[0]}
            />
            <FormError message={form.formError} />
            <Button type="submit" disabled={form.pending}>
              Delete my account
            </Button>
          </form>
        </Dialog>
      )}
    </>
  );
}
