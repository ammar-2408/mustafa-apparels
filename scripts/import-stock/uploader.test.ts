import type { MediaConfig } from '@mustafa/core/integrations/media';
import { describe, expect, it, vi } from 'vitest';

import { liveUploader } from './uploader';

const config: MediaConfig = {
  mode: 'live',
  appEnv: 'development',
  cloudName: 'mustafa',
  apiKey: '123456',
  apiSecret: 's3cret',
};
const ID = 'products/imported/DHN-01/dhnk1-0a1b2c3d';
const resource = {
  public_id: ID,
  format: 'jpg',
  bytes: 4,
  width: 2,
  height: 3,
  created_at: '2026-11-05T12:00:00Z',
};

describe('liveUploader', () => {
  it('posts the signed fields and the file, then reads the asset back from the Admin API', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes('/upload') && !url.includes('/resources/')
        ? Response.json({ public_id: ID })
        : Response.json(resource),
    );
    const asset = await liveUploader(config, fetchImpl as never).upload(
      ID,
      'image',
      Buffer.from('jpeg'),
      'dhnk1.jpg',
    );
    expect(asset).toMatchObject({ publicId: ID, format: 'jpg', width: 2, height: 3 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/mustafa/image/upload');
    const form = init.body as FormData;
    expect(form.get('public_id')).toBe(ID);
    expect(form.get('overwrite')).toBe('false');
    expect(form.get('signature')).toMatch(/^[0-9a-f]{40}$/);
    expect(form.get('api_secret')).toBeNull();
    expect((form.get('file') as File).name).toBe('dhnk1.jpg');
  });

  it('reports Cloudinary refusing a file', async () => {
    const fetchImpl = vi.fn(async () => new Response('Invalid image file', { status: 400 }));
    await expect(
      liveUploader(config, fetchImpl as never).upload(ID, 'image', Buffer.from('x'), 'a.jpg'),
    ).rejects.toThrow('Cloudinary refused a.jpg (400): Invalid image file');
  });

  it('asks the Admin API whether a file already exists', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: { message: 'not found' } }, { status: 404 }),
    );
    expect(await liveUploader(config, fetchImpl as never).find(ID, 'image')).toBeNull();
  });
});
