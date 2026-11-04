import { expect, type Page, test } from '@playwright/test';

// E2E servers never run as the indexable production site: check-env refuses
// SITE_INDEXABLE=true outside production, and CI sets it to false. So both apps send noindex.
const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const apps = [
  { name: 'web', origin: WEB },
  { name: 'admin', origin: ADMIN },
];

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
};

for (const app of apps) {
  for (const path of ['/', '/no-such-page']) {
    test(`${app.name} ${path} sends noindex and doesn't announce Next.js`, async ({ request }) => {
      const response = await request.get(`${app.origin}${path}`);
      const headers = response.headers();
      expect(headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(headers['x-powered-by']).toBeUndefined();
    });
  }

  for (const path of ['/', '/login']) {
    test(`${app.name} ${path} sends the security headers, HSTS without preload`, async ({
      request,
    }) => {
      const headers = (await request.get(`${app.origin}${path}`)).headers();
      expect(headers).toMatchObject(SECURITY_HEADERS);
    });
  }
}

// Exactly one policy: two would both apply, and the stricter one would win silently.
async function cspOf(request: import('@playwright/test').APIRequestContext, url: string) {
  const response = await request.get(url, { maxRedirects: 0 });
  const policies = response
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'content-security-policy');
  expect(policies, url).toHaveLength(1);
  return policies[0]!.value;
}

test.describe('two-tier CSP', () => {
  test('cached storefront pages get the fixed policy, with no nonce', async ({ request }) => {
    for (const path of ['/', '/no-such-page']) {
      const csp = await cspOf(request, `${WEB}${path}`);
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).not.toContain('nonce-');
      expect(csp).toContain("media-src 'self' https://res.cloudinary.com");
    }
  });

  test('dynamic storefront pages get a nonce that changes every request', async ({ request }) => {
    for (const path of ['/login', '/register', '/forgot-password', '/reset-password', '/account']) {
      const first = await cspOf(request, `${WEB}${path}`);
      const second = await cspOf(request, `${WEB}${path}`);
      expect(first, path).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
      expect(first, path).not.toContain("'unsafe-inline' https://www.googletagmanager.com");
      expect(first).not.toBe(second);
      expect(first).toContain("media-src 'self' https://res.cloudinary.com");
    }
  });

  test('every admin page gets a nonce and no GA4', async ({ request }) => {
    for (const path of ['/login', '/login/verify', '/']) {
      const csp = await cspOf(request, `${ADMIN}${path}`);
      expect(csp, path).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
      expect(csp, path).not.toContain('googletagmanager');
    }
  });
});

// Collects CSP violations the browser reports while the page loads and hydrates.
async function violationsOn(page: Page, url: string) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) seen.push(message.text());
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(
        `Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return seen;
}

for (const url of [
  `${WEB}/`,
  `${WEB}/login`,
  `${WEB}/register`,
  `${WEB}/forgot-password`,
  `${WEB}/reset-password?token=x`,
  `${ADMIN}/login`,
  `${ADMIN}/`,
]) {
  test(`no CSP violations on ${url}`, async ({ page }) => {
    expect(await violationsOn(page, url)).toEqual([]);
  });
}

test('a Tier B page still works under its nonce: the login form reacts', async ({ page }) => {
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
});

test('the revalidate endpoint refuses an unsigned call, is never cached and has no nonce', async ({
  request,
}) => {
  const response = await request.post(`${WEB}/api/revalidate`, {
    data: { tags: ['products'] },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-security-policy'] ?? '').not.toContain('nonce-');
  expect((await request.get(`${WEB}/api/revalidate`)).status()).toBe(405);
});
