import { expect, test } from '@playwright/test';

// E2E servers never run as the indexable production site: check-env refuses
// SITE_INDEXABLE=true outside production, and CI sets it to false. So both apps send noindex.
const apps = [
  { name: 'web', origin: 'http://localhost:3000' },
  { name: 'admin', origin: 'http://localhost:3001' },
];

for (const app of apps) {
  for (const path of ['/', '/no-such-page']) {
    test(`${app.name} ${path} sends noindex and doesn't announce Next.js`, async ({ request }) => {
      const response = await request.get(`${app.origin}${path}`);
      const headers = response.headers();
      expect(headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(headers['x-powered-by']).toBeUndefined();
    });
  }
}
