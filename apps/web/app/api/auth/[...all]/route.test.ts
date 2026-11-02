// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const getAuth = vi.hoisted(() => vi.fn());
vi.mock('../../../../lib/auth', () => ({ getAuth }));

import { GET, POST } from './route';

beforeEach(() => {
  getAuth.mockReset();
});

it('answers 503 when sign-in is not set up (mock mode, no database)', async () => {
  getAuth.mockReturnValue(null);
  const response = await POST(new Request('http://localhost/api/auth/sign-in/email'));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: { code: 'UNAVAILABLE', message: "Sign-in isn't available here yet." },
  });
});

it('hands every request to Better Auth otherwise', async () => {
  const handler = vi.fn(async () => new Response('ok'));
  getAuth.mockReturnValue({ handler });
  const request = new Request('http://localhost/api/auth/get-session');
  expect(await (await GET(request)).text()).toBe('ok');
  expect(handler).toHaveBeenCalledWith(request);
});
