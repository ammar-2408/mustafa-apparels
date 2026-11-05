'use server';
import 'server-only';

import * as settings from '@mustafa/core/settings';
import { getDb } from '@mustafa/db/client';
import { settingInput } from '@mustafa/validators/settings';
import { revalidatePath } from 'next/cache';

import { adminAction } from '../../../lib/action';
import { revalidateStorefront } from '../../../lib/revalidate';

// One setting at a time (docs/api.md §3). Phone numbers are saved in E.164, the email in lower
// case; saving the same value again writes nothing. Every storefront page shows the contact
// details, so the settings tag refreshes them all.
const update = adminAction(settingInput, async (input, { session }) => {
  await settings.set(getDb(), input, { actorId: session.user.id });
  revalidatePath('/settings');
  await revalidateStorefront(['settings']);
  return { key: input.key };
});

// A 'use server' file exports async functions only.
export async function updateSiteSettings(raw: unknown) {
  return update(raw);
}
