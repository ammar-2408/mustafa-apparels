// Playwright globalSetup: on the local dev server, request each storefront page type once, one
// at a time, before any test. Next's dev server can answer 500 ("Unexpected end of JSON input")
// when parallel workers hit a route it hasn't compiled yet (docs/debugging.md). The built app
// on CI has nothing to compile, so this only saves time there.
const BASE = 'http://localhost:3000';

async function get(path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(BASE + path, { redirect: 'manual' }).catch(() => null);
    if (response && response.status < 500) return response.text();
  }
  return '';
}

export default async function warmUp() {
  const shop = await get('/shop');
  const suit = shop.match(/href="(\/products\/[a-z0-9-]+)"/)?.[1];
  const collection = shop.match(/href="(\/collections\/[a-z0-9-]+)"/)?.[1];
  for (const path of [
    '/',
    '/shop/page/2',
    collection,
    collection && `${collection}/page/2`,
    suit,
    '/search?q=dhanak',
    '/api/search/suggest?q=dhanak',
    '/login',
    '/account',
  ]) {
    if (path) await get(path);
  }
}
