import { expect, type Page } from '@playwright/test';

// The favicons, theme colour and manifest every page links to (docs/design.md §1.3).
export async function expectBrandHead(page: Page, manifestName: string) {
  await page.goto('/');
  const head = page.locator('head');
  await expect(head.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#faf7ec$/i);
  await expect(head.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
  await expect(head.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const hrefs = await head
    .locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  for (const href of hrefs) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }

  const manifestHref = await head.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await (
    await page.request.get(new URL(`${manifestHref}`, page.url()).href)
  ).json();
  expect(manifest.name).toBe(manifestName);
  for (const icon of manifest.icons) {
    const src = new URL(icon.src, page.url()).href;
    expect((await page.request.get(src)).status(), icon.src).toBe(200);
  }

  // Browsers ask for /favicon.ico even when no page links to it.
  const ico = await page.request.get('/favicon.ico');
  expect(ico.status()).toBe(200);
  expect(ico.headers()['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
}
