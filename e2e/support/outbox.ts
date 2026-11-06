// Reads the emails the apps "send" in mock mode: one JSON file each in .e2e-outbox/ at the repo root
// (packages/core/integrations/email.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect } from '@playwright/test';

type SavedEmail = { to: string; subject: string; text: string; kind: string; sentAt: string };

const OUTBOX = join(process.cwd(), '.e2e-outbox');

function emailsTo(to: string, kind: string): SavedEmail[] {
  if (!existsSync(OUTBOX)) return [];
  return readdirSync(OUTBOX)
    .sort()
    .map((file) => JSON.parse(readFileSync(join(OUTBOX, file), 'utf8')) as SavedEmail)
    .filter((email) => email.to === to && email.kind === kind);
}

// Waits for the nth email of a kind to an address, then returns its link.
export async function linkFromEmail(to: string, kind: string, nth = 1) {
  let email: SavedEmail | undefined;
  await expect
    .poll(() => (email = emailsTo(to, kind)[nth - 1]) !== undefined, { timeout: 15_000 })
    .toBe(true);
  const link = email!.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error(`the ${kind} email to ${to} has no link`);
  return link;
}

// Waits for an email of a kind whose text contains `marker`, and returns it.
export async function emailWith(kind: string, marker: string) {
  let found: SavedEmail | undefined;
  await expect
    .poll(
      () => {
        if (!existsSync(OUTBOX)) return false;
        found = readdirSync(OUTBOX)
          .map((file) => JSON.parse(readFileSync(join(OUTBOX, file), 'utf8')) as SavedEmail)
          .find((email) => email.kind === kind && email.text.includes(marker));
        return found !== undefined;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return found!;
}
