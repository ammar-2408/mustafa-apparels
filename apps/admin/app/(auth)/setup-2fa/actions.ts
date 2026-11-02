'use server';
import 'server-only';

import { adminAccess } from '@mustafa/auth/guards';
import { type ActionResult, fail, ok, toActionError } from '@mustafa/core/action-result';
import { forbidden, unauthenticated } from '@mustafa/core/errors';
import { fieldErrorsOf, twoFactorSetupInput } from '@mustafa/validators/auth';
import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import QRCode from 'qrcode';

import { getAuth, getSession } from '../../../lib/auth';

export type TwoFactorSetup = { qr: string; secret: string; backupCodes: string[] };

// Step one of the forced 2FA setup (docs/auth-security.md §1): check the password, create the
// secret, and draw its QR code here on the server, as a PNG data URL.
// Only an admin who hasn't set up 2FA yet may call it.
export async function startTwoFactorSetup(raw: unknown): Promise<ActionResult<TwoFactorSetup>> {
  const access = adminAccess(await getSession());
  if (access === 'signed-out') return toActionError(unauthenticated());
  if (access === 'forbidden') return toActionError(forbidden());
  if (access === 'ok') return fail('CONFLICT', '2FA is already on for this account.');

  const parsed = twoFactorSetupInput.safeParse(raw);
  if (!parsed.success) {
    return fail('VALIDATION', 'Check the highlighted fields', fieldErrorsOf(parsed.error));
  }

  try {
    const result = await getAuth()!.api.enableTwoFactor({
      body: { password: parsed.data.password },
      headers: await headers(),
    });
    if (!('totpURI' in result)) return fail('INTERNAL', 'Something went wrong. Please try again.');
    const secret = new URL(result.totpURI).searchParams.get('secret') ?? '';
    const qr = await QRCode.toDataURL(result.totpURI, { margin: 1, width: 240 });
    return ok({ qr, secret, backupCodes: result.backupCodes });
  } catch (error) {
    if (isAPIError(error) && (error.statusCode === 400 || error.statusCode === 401)) {
      return fail('VALIDATION', 'Check the highlighted fields', {
        password: ['That password is incorrect'],
      });
    }
    return toActionError(error);
  }
}
