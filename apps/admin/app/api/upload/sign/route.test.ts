// @vitest-environment node
import { requireAdmin as guardAdmin } from '@mustafa/auth/guards';
import { rateLimited } from '@mustafa/core/errors';
import { verifyUploadSignature } from '@mustafa/core/integrations/media';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: null as unknown,
  product: { id: 'p1' } as unknown,
  category: { id: 'c1' } as unknown,
}));
const enforceLimit = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('../../../../lib/auth', () => ({
  requireAdmin: async () => guardAdmin(state.session as never),
}));
vi.mock('../../../../lib/limits', () => ({
  ADMIN_LIMITS: { uploadSign: { name: 'upload-sign' } },
  enforceLimit,
}));
vi.mock('../../../../lib/media', () => ({
  mediaConfig: () => ({
    mode: 'live',
    appEnv: 'production',
    cloudName: 'mustafa',
    apiKey: '123456',
    apiSecret: 'top-secret-value',
  }),
}));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/products', () => ({ getById: async () => state.product }));
vi.mock('@mustafa/core/categories', () => ({ getById: async () => state.category }));

import { POST } from './route';

const ADMIN = {
  user: { id: 'a1', role: 'admin', banned: false, twoFactorEnabled: true },
  session: { app: 'admin' },
};

const post = (body: unknown) =>
  POST(
    new Request('http://localhost:3001/api/upload/sign', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  state.session = ADMIN;
  state.product = { id: 'p1' };
  state.category = { id: 'c1' };
  enforceLimit.mockReset().mockResolvedValue(undefined);
});

describe('POST /api/upload/sign', () => {
  it('signs a photo for an existing suit, without the secret, never cached', async () => {
    const response = await post({ kind: 'image', target: 'product', targetId: 'p1' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const text = await response.text();
    expect(text).not.toContain('top-secret-value');
    const body = JSON.parse(text);
    expect(body.uploadUrl).toBe('https://api.cloudinary.com/v1_1/mustafa/image/upload');
    expect(body.publicId).toMatch(/^products\/p1\//);
    expect(verifyUploadSignature(body.fields, 'top-secret-value')).toBe(true);
    expect(enforceLimit).toHaveBeenCalledWith({ name: 'upload-sign' }, 'a1');
  });

  it('signs a video for a suit and an image for a collection', async () => {
    const video = await (await post({ kind: 'video', target: 'product', targetId: 'p1' })).json();
    expect(video.fields.eager).toContain('ac_none');
    const image = await (await post({ kind: 'image', target: 'category', targetId: 'c1' })).json();
    expect(image.publicId).toMatch(/^categories\/c1\//);
  });

  it('answers 401 signed out and 403 to a customer or a pre-2FA admin', async () => {
    state.session = null;
    expect((await post({ kind: 'image', target: 'product', targetId: 'p1' })).status).toBe(401);
    state.session = { ...ADMIN, user: { ...ADMIN.user, role: 'customer' } };
    expect((await post({ kind: 'image', target: 'product', targetId: 'p1' })).status).toBe(403);
    state.session = { ...ADMIN, user: { ...ADMIN.user, twoFactorEnabled: false } };
    expect((await post({ kind: 'image', target: 'product', targetId: 'p1' })).status).toBe(403);
  });

  it.each([
    ['an unknown kind', { kind: 'raw', target: 'product', targetId: 'p1' }],
    [
      'a folder chosen by the browser',
      { kind: 'image', target: 'product', targetId: 'p1', folder: 'x' },
    ],
    ['a body that is not JSON', 'kind=image'],
  ])('answers 400 to %s, before counting it', async (_name, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION' } });
    expect(enforceLimit).not.toHaveBeenCalled();
  });

  it('answers 404 for a suit or collection that does not exist', async () => {
    state.product = null;
    expect((await post({ kind: 'image', target: 'product', targetId: 'gone' })).status).toBe(404);
    state.category = null;
    expect((await post({ kind: 'image', target: 'category', targetId: 'gone' })).status).toBe(404);
  });

  it('answers 429 over the limit', async () => {
    enforceLimit.mockRejectedValue(rateLimited());
    expect((await post({ kind: 'image', target: 'product', targetId: 'p1' })).status).toBe(429);
  });
});
