import { expect, randomIp, test } from '../support/users';

// The search limit (docs/api.md): 30 suggestion requests a minute per IP. There is no search
// page any more (owner, 2026-11-22). Each test uses its own IP, so others are not affected.
test('the 31st suggestion request in a minute gets 429', async ({ request }) => {
  const ip = randomIp();
  const suggest = () =>
    request.get('/api/search/suggest?q=dhanak', { headers: { 'x-nf-client-connection-ip': ip } });
  for (let i = 0; i < 30; i++) expect((await suggest()).status()).toBe(200);
  const refused = await suggest();
  expect(refused.status()).toBe(429);
  expect(refused.headers()['retry-after']).toBe('60');
});
