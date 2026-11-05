import * as settings from '@mustafa/core/settings';
import { getDb } from '@mustafa/db/client';
import type { Metadata } from 'next';

import { type SettingField, SettingsGroup } from '../../../components/settings-group';
import { requireAdminPage } from '../../../lib/auth';

export const metadata: Metadata = { title: 'Settings' };

// The shop is online only: no address or opening hours (docs/prd.md).
const GROUPS: { title: string; description?: string; fields: SettingField[] }[] = [
  {
    title: 'Contact',
    description: 'Shown on every page. WhatsApp comes first, because that is where orders happen.',
    fields: [
      { key: 'shop_name', label: 'Shop name', kind: 'text', maxLength: 60 },
      {
        key: 'whatsapp',
        label: 'WhatsApp number',
        kind: 'text',
        type: 'tel',
        hint: 'A Pakistani mobile, e.g. 0348 2799707. Saved as +92…',
      },
      {
        key: 'phone',
        label: 'Phone number',
        kind: 'text',
        type: 'tel',
        hint: 'A Pakistani mobile, e.g. 0306 9558717.',
      },
      { key: 'email', label: 'Email', kind: 'text', type: 'email' },
    ],
  },
  {
    title: 'Service area',
    fields: [
      {
        key: 'service_area',
        label: 'Where you deliver',
        kind: 'text',
        maxLength: 120,
        hint: 'E.g. All of Pakistan.',
      },
    ],
  },
  {
    title: 'Delivery',
    fields: [
      {
        key: 'delivery_info',
        label: 'Delivery',
        kind: 'textarea',
        maxLength: 1000,
        hint: 'Courier, time and cost, in plain words.',
      },
    ],
  },
  {
    title: 'Payment',
    fields: [
      {
        key: 'payment_info',
        label: 'Payment',
        kind: 'textarea',
        maxLength: 1000,
        hint: 'How customers pay, arranged in chat.',
      },
    ],
  },
  {
    title: 'Returns',
    fields: [
      { key: 'return_policy', label: 'Returns and exchanges', kind: 'textarea', maxLength: 1000 },
    ],
  },
  {
    title: 'Reply note',
    fields: [
      {
        key: 'reply_note',
        label: 'Reply note',
        kind: 'textarea',
        maxLength: 200,
        hint: 'Shown by the contact buttons, e.g. "We usually reply within a few hours."',
      },
    ],
  },
  {
    title: 'Social links',
    description: 'Optional. The https link to each profile; leave a field empty to hide it.',
    fields: [
      { key: 'socials', part: 'instagram', label: 'Instagram', kind: 'text', type: 'url' },
      { key: 'socials', part: 'facebook', label: 'Facebook', kind: 'text', type: 'url' },
      { key: 'socials', part: 'tiktok', label: 'TikTok', kind: 'text', type: 'url' },
      { key: 'socials', part: 'youtube', label: 'YouTube', kind: 'text', type: 'url' },
    ],
  },
  {
    title: 'Search defaults',
    description: 'Used by pages that have no title or description of their own.',
    fields: [
      { key: 'default_seo', part: 'title', label: 'Default title', kind: 'text', maxLength: 60 },
      {
        key: 'default_seo',
        part: 'description',
        label: 'Default description',
        kind: 'textarea',
        maxLength: 160,
      },
    ],
  },
];

export default async function SettingsPage() {
  await requireAdminPage();
  const values = (await settings.get(getDb())) as Record<string, unknown>;
  return (
    <>
      <h1 className="mb-2 text-h2 font-light">Settings</h1>
      <p className="mb-10 text-small text-muted">
        Each box saves on its own. Changes show on the shop straight away.
      </p>
      <div className="flex max-w-3xl flex-col gap-8">
        {GROUPS.map((group) => (
          <SettingsGroup key={group.title} {...group} values={values} />
        ))}
      </div>
    </>
  );
}
