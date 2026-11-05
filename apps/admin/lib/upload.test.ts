import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadError, uploadFile } from './upload';

// A stand-in XMLHttpRequest the test drives: progress, then a status and body, or a network error.
class FakeXhr {
  static last: FakeXhr | null = null;
  upload = {
    onprogress: null as
      null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void),
  };
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  status = 0;
  responseText = '';
  url = '';
  sent: FormData | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(_method: string, url: string) {
    this.url = url;
  }
  send(body: FormData) {
    this.sent = body;
  }
  answer(status: number, body: string) {
    this.status = status;
    this.responseText = body;
    this.onload?.();
  }
}

const signed = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/mustafa/image/upload',
  publicId: 'products/p1/abc',
  fields: { public_id: 'products/p1/abc', signature: 'sig', api_key: 'k' },
};
const fetchMock = vi.fn();
const file = new File(['x'], 'front.jpg', { type: 'image/jpeg' });
const target = { kind: 'image' as const, target: 'product' as const, targetId: 'p1' };

beforeEach(() => {
  FakeXhr.last = null;
  // A fresh Response per call: a body can only be read once.
  fetchMock.mockReset().mockImplementation(async () => Response.json(signed));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Lets the sign request finish so the new upload request exists (call before each upload).
const started = async () => {
  await vi.waitFor(() => expect(FakeXhr.last?.sent).toBeTruthy());
  const xhr = FakeXhr.last!;
  FakeXhr.last = null;
  return xhr;
};

describe('uploadFile', () => {
  it('signs, sends the signed fields with the file, reports progress and returns the server’s id', async () => {
    const progress = vi.fn();
    const done = uploadFile(file, target, progress);
    const xhr = await started();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/upload/sign',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual(target);
    expect(xhr.url).toBe(signed.uploadUrl);
    expect(xhr.sent?.get('signature')).toBe('sig');
    expect(xhr.sent?.get('file')).toBeInstanceOf(File);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
    xhr.answer(200, '{}');
    expect(await done).toBe('products/p1/abc');
    expect(progress.mock.calls.map((c) => c[0])).toEqual([0.5, 1]);
  });

  it('passes on the server’s reason when signing is refused', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: 'Too many attempts.' } }, { status: 429 }),
    );
    await expect(uploadFile(file, target)).rejects.toThrow('Too many attempts.');
  });

  it('falls back to a general message when the sign answer is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));
    await expect(uploadFile(file, target)).rejects.toThrow('The upload could not start.');
  });

  it('says why Cloudinary refused the file', async () => {
    const done = uploadFile(file, target);
    (await started()).answer(400, JSON.stringify({ error: { message: 'File size too large' } }));
    await expect(done).rejects.toThrow('The upload was refused: File size too large');
  });

  it('gives a general message for a refusal with no reason, and a connection hint on a network error', async () => {
    const refused = uploadFile(file, target);
    (await started()).answer(502, '<html>bad gateway</html>');
    await expect(refused).rejects.toThrow('The upload failed. Please try again.');

    const offline = uploadFile(file, target);
    const xhr = await started();
    xhr.onerror?.();
    const error = await offline.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UploadError);
    expect((error as Error).message).toBe('The upload failed. Check the connection.');
  });
});
