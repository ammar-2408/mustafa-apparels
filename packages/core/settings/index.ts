// Shop contact details and policies (docs/database.md §2 site_setting). Unset keys are null;
// the owner fills them in admin. The seed sets only the values known from the owner.
import type { Database } from '@mustafa/db/client';
import { siteSetting } from '@mustafa/db/schema';
import {
  SETTING_KEYS,
  type SettingInput,
  type SettingKey,
  type SettingValue,
  settingValue,
} from '@mustafa/validators/settings';
import { eq } from 'drizzle-orm';

import { type Actor, record } from '../audit';

export type SiteSettings = { [K in SettingKey]: SettingValue<K> | null };

const isKey = (key: string): key is SettingKey => (SETTING_KEYS as string[]).includes(key);

export async function get(db: Database): Promise<SiteSettings> {
  const settings = Object.fromEntries(SETTING_KEYS.map((key) => [key, null])) as SiteSettings;
  for (const { key, value } of await db.select().from(siteSetting)) {
    if (!isKey(key)) continue;
    const parsed = settingValue[key].safeParse(value);
    if (parsed.success) {
      (settings as Record<SettingKey, unknown>)[key] = parsed.data;
    } else {
      // The key only: the value may hold contact details.
      console.warn(`site_setting "${key}" fails its rules, so it is treated as unset`);
    }
  }
  return settings;
}

// `input` is already parsed by settingInput, so phone numbers are E.164.
export async function set(db: Database, { key, value }: SettingInput, actor: Actor) {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(siteSetting)
      .where(eq(siteSetting.key, key))
      .for('update');
    if (before && JSON.stringify(before.value) === JSON.stringify(value)) return;
    await tx
      .insert(siteSetting)
      .values({ key, value, updatedBy: actor.actorId })
      .onConflictDoUpdate({
        target: siteSetting.key,
        set: { value, updatedBy: actor.actorId, updatedAt: new Date() },
      });
    await record(tx, actor, {
      action: 'setting.update',
      entity: 'setting',
      entityId: key,
      changes: { before: { value: before?.value ?? null }, after: { value } },
    });
  });
}
