// Site settings, one schema per key (docs/database.md §2 site_setting). The shop is online
// only, so there is no address or opening-hours setting.
import { z } from 'zod';

import { noBannedTerms } from './banned-terms';
import { pkMobile } from './phone';

const text = (min: number, max: number) => noBannedTerms(z.string().trim().min(min).max(max));

const profile = (hosts: RegExp) =>
  z.url({ protocol: /^https$/, hostname: hosts, error: 'Use the https link to your profile' });

export const settingValue = {
  shop_name: text(2, 60),
  phone: pkMobile,
  whatsapp: pkMobile,
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  service_area: text(2, 120),
  delivery_info: text(1, 1000),
  payment_info: text(1, 1000),
  return_policy: text(1, 1000),
  reply_note: text(1, 200),
  socials: z
    .object({
      instagram: profile(/^(www\.)?instagram\.com$/),
      facebook: profile(/^(www\.|m\.)?facebook\.com$/),
      tiktok: profile(/^(www\.)?tiktok\.com$/),
      youtube: profile(/^(www\.)?youtube\.com$/),
    })
    .partial()
    .strict(),
  default_seo: z.object({ title: text(1, 60), description: text(1, 160) }).strict(),
};

export type SettingKey = keyof typeof settingValue;
export type SettingValue<K extends SettingKey> = z.output<(typeof settingValue)[K]>;

export const SETTING_KEYS = Object.keys(settingValue) as SettingKey[];

export const settingInput = z.discriminatedUnion(
  'key',
  SETTING_KEYS.map((key) =>
    z.object({ key: z.literal(key), value: settingValue[key] }).strict(),
  ) as unknown as [
    z.ZodObject<{ key: z.ZodLiteral<SettingKey>; value: z.ZodType }>,
    ...z.ZodObject<{ key: z.ZodLiteral<SettingKey>; value: z.ZodType }>[],
  ],
);

export type SettingInput = { [K in SettingKey]: { key: K; value: SettingValue<K> } }[SettingKey];
