// @vitest-environment node
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { requireAdmin as guardAdmin } from '@mustafa/auth/guards';
import { createMockStore, type MediaConfig, signUpload } from '@mustafa/core/integrations/media';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ session: null as unknown, allowed: true, dir: '' }));

vi.mock('server-only', () => ({}));
vi.mock('../../../../lib/auth', () => ({
  requireAdmin: async () => guardAdmin(state.session as never),
}));
vi.mock('../../../../lib/media', () => ({ mockUploadsAllowed: () => state.allowed }));
vi.mock('@mustafa/core/integrations/media', async (original) => {
  const actual = await original<typeof import('@mustafa/core/integrations/media')>();
  return { ...actual, createMockStore: () => actual.createMockStore(state.dir) };
});

import { POST } from './route';

const mock: MediaConfig = {
  mode: 'mock',
  appEnv: 'test',
  cloudName: undefined,
  apiKey: undefined,
  apiSecret: undefined,
};
const ADMIN = {
  user: { id: 'a1', role: 'admin', banned: false, twoFactorEnabled: true },
  session: { app: 'admin' },
};

const upload = (kind: 'image' | 'video', file: File, change: Record<string, string> = {}) => {
  const signed = signUpload(mock, { kind, target: 'product', targetId: 'p1' });
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...signed.fields, ...change })) form.set(key, value);
  form.set('file', file);
  return {
    publicId: signed.publicId,
    response: POST(
      new Request('http://localhost:3001/api/upload/mock', { method: 'POST', body: form }),
    ),
  };
};

const file = (name: string, bytes = 2048) => new File([new Uint8Array(bytes)], name);

beforeEach(() => {
  state.session = ADMIN;
  state.allowed = true;
  state.dir = mkdtempSync(join(tmpdir(), 'mock-media-'));
});

describe('POST /api/upload/mock', () => {
  it('records a signed photo with its real size, like Cloudinary', async () => {
    const { publicId, response } = upload('image', file('front.JPEG', 3000));
    const res = await response;
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      public_id: publicId,
      resource_type: 'image',
      bytes: 3000,
    });
    expect(createMockStore(state.dir).get(publicId)).toMatchObject({
      kind: 'image',
      format: 'jpg',
      bytes: 3000,
      durationSeconds: null,
    });
  });

  it('reads a video’s length from its file name', async () => {
    const { publicId, response } = upload('video', file('walk-61s.mp4'));
    expect((await response).status).toBe(200);
    expect(createMockStore(state.dir).get(publicId)).toMatchObject({
      kind: 'video',
      durationSeconds: 61,
    });
  });

  it('refuses a changed field (bad signature) and a format outside the signed list', async () => {
    expect(
      (await upload('image', file('a.jpg'), { public_id: 'products/other/x' }).response).status,
    ).toBe(401);
    expect((await upload('image', file('a.gif')).response).status).toBe(400);
    expect((await upload('image', file('a.mp4')).response).status).toBe(400);
  });

  it('needs an admin', async () => {
    state.session = null;
    expect((await upload('image', file('a.jpg')).response).status).toBe(401);
  });

  it('does not exist outside mock mode on a local or CI run', async () => {
    state.allowed = false;
    expect((await upload('image', file('a.jpg')).response).status).toBe(404);
  });
});
