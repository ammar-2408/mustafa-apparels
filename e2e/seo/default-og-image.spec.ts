import { expect, test } from '@playwright/test';

// docs/design.md §8.1: pages without their own image share the brand image, by absolute URL,
// in the server HTML <head> (no JavaScript), so link previews and crawlers see it.
const IMAGE_PATH = '/brand/social/og-share-image-1200x630.png';

const metaTag = (html: string, key: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]*>`))?.[0];
const content = (tag: string | undefined) => tag?.match(/content="([^"]*)"/)?.[1];

test('home page shares the default image with absolute Open Graph and Twitter tags', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  const headEnd = html.indexOf('</head>');

  const expected: Record<string, string | RegExp> = {
    'og:image': new RegExp(`^https?://[^/]+${IMAGE_PATH}$`),
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': 'MA Apparels by Mustafa Ahmed',
    'og:site_name': 'Mustafa Apparels',
    'og:locale': 'en_PK',
    'og:type': 'website',
    'twitter:card': 'summary_large_image',
    'twitter:image': new RegExp(`^https?://[^/]+${IMAGE_PATH}$`),
  };
  for (const [key, value] of Object.entries(expected)) {
    const tag = metaTag(html, key);
    expect(tag, `${key} is missing`).toBeTruthy();
    expect(html.indexOf(tag!), `${key} is outside <head>`).toBeLessThan(headEnd);
    if (typeof value === 'string') expect(content(tag), key).toBe(value);
    else expect(content(tag), key).toMatch(value);
  }

  const image = await request.get(content(metaTag(html, 'og:image'))!);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
});
