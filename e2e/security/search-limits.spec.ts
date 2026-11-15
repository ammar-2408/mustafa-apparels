import { expect, randomIp, test } from '../support/users';

// Search limits (docs/api.md): 30 a minute per IP for the search page, counted apart from the
// suggestions (also 30 a minute). Each test uses its own IP, so others aren't affected.
test('the 31st search in a minute from one address is refused in plain words', async ({
  request,
}) => {
  const ip = randomIp();
  const search = () =>
    request.get('/search?q=dhanak', { headers: { 'x-nf-client-connection-ip': ip } });
  for (let i = 0; i < 30; i++) {
    expect(await (await search()).text()).not.toContain('Too many searches');
  }
  const refused = await search();
  expect(refused.status()).toBe(200);
  expect(await refused.text()).toContain('Too many searches at once');
  // Another address still searches.
  const other = await request.get('/search?q=dhanak', {
    headers: { 'x-nf-client-connection-ip': randomIp() },
  });
  expect(await other.text()).not.toContain('Too many searches');
});

test('the 31st suggestion request in a minute gets 429', async ({ request }) => {
  const ip = randomIp();
  const suggest = () =>
    request.get('/api/search/suggest?q=dhanak', { headers: { 'x-nf-client-connection-ip': ip } });
  for (let i = 0; i < 30; i++) expect((await suggest()).status()).toBe(200);
  const refused = await suggest();
  expect(refused.status()).toBe(429);
  expect(refused.headers()['retry-after']).toBe('60');
});
