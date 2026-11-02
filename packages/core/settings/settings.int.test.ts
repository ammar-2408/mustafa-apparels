import { auditLog, siteSetting } from '@mustafa/db/schema';
import { createTestDb, resetTestDb, type TestDb } from '@mustafa/db/testing';
import { settingInput } from '@mustafa/validators/settings';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeUser } from '../test/factories';
import * as settings from './index';

let db: TestDb;
let actor: { actorId: string };

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  actor = { actorId: (await makeUser(db, { role: 'admin' })).id };
});

afterEach(async () => {
  await resetTestDb(db);
  vi.restoreAllMocks();
});

const set = (key: string, value: unknown) =>
  settings.set(db, settingInput.parse({ key, value }), actor);

describe('settings.get', () => {
  it('returns null for every key the owner has not filled in', async () => {
    const all = await settings.get(db);
    expect(Object.values(all).every((value) => value === null)).toBe(true);
    expect(Object.keys(all)).toContain('whatsapp');
  });

  it('returns stored values by key', async () => {
    await set('whatsapp', '0348 2799707');
    await set('socials', { instagram: 'https://www.instagram.com/mustafaapparels' });
    const all = await settings.get(db);
    expect(all.whatsapp).toBe('+923482799707');
    expect(all.socials).toEqual({ instagram: 'https://www.instagram.com/mustafaapparels' });
  });

  it('treats a stored value that fails its rules as unset, and logs the key only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await db.insert(siteSetting).values({ key: 'phone', value: 'call-me-0300-secret' });
    await db.insert(siteSetting).values({ key: 'address', value: 'Lahore' });
    const all = await settings.get(db);
    expect(all.phone).toBeNull();
    expect(all).not.toHaveProperty('address');
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0])).toContain('phone');
    expect(String(warn.mock.calls[0])).not.toContain('secret');
  });
});

describe('settings.set', () => {
  it('saves the value with its editor and records before and after', async () => {
    await set('reply_note', 'We reply within a few hours.');
    await set('reply_note', 'We reply the same day.');
    const [row] = await db.select().from(siteSetting).where(eq(siteSetting.key, 'reply_note'));
    expect(row).toMatchObject({ value: 'We reply the same day.', updatedBy: actor.actorId });
    const entries = await db.select().from(auditLog);
    expect(entries.map((e) => e.changes)).toEqual([
      { before: { value: null }, after: { value: 'We reply within a few hours.' } },
      {
        before: { value: 'We reply within a few hours.' },
        after: { value: 'We reply the same day.' },
      },
    ]);
    expect(entries[0]).toMatchObject({
      action: 'setting.update',
      entity: 'setting',
      entityId: 'reply_note',
    });
  });

  it('writes nothing when the value is the same', async () => {
    await set('service_area', 'Pakistan');
    await set('service_area', 'Pakistan');
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });
});
