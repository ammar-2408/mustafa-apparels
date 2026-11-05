'use server';
import 'server-only';

import * as inquiries from '@mustafa/core/inquiries';
import { getDb } from '@mustafa/db/client';
import { inquiryStatusInput } from '@mustafa/validators/inquiry';
import { revalidatePath } from 'next/cache';

import { adminAction } from '../../../lib/action';

// Nothing public changes, so only the inbox and the dashboard count refresh.
const setStatus = adminAction(inquiryStatusInput, async (input, { session }) => {
  const row = await inquiries.setStatus(getDb(), input, { actorId: session.user.id });
  revalidatePath('/inquiries');
  revalidatePath('/');
  return { id: row.id, status: row.status };
});

// A 'use server' file exports async functions only.
export async function setInquiryStatus(raw: unknown) {
  return setStatus(raw);
}
