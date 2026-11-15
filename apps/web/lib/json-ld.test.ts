import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mustafaapparels.com');

const { serializeJsonLd } = await import('./seo');

// Built from char codes, so this test can't be fooled the way the first version of the
// function was (a mangled escape in the source replaced `<` with `<`).
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

describe('serializeJsonLd', () => {
  const hostile = {
    name: '</script><script>alert(1)</script>',
    description: `<!-- a & b > c ${LINE_SEPARATOR} d ${PARAGRAPH_SEPARATOR} e`,
  };

  it('never lets text close the script tag or open a comment', () => {
    const out = serializeJsonLd(hostile);
    expect(out).not.toMatch(/[<>&]/);
    expect(out.toLowerCase()).not.toContain('</script');
    expect(out).not.toContain(LINE_SEPARATOR);
    expect(out).not.toContain(PARAGRAPH_SEPARATOR);
  });

  it('writes those characters as JSON escapes that read back unchanged', () => {
    const out = serializeJsonLd(hostile);
    expect(out).toContain(String.fromCharCode(0x5c) + 'u003c/script');
    expect(JSON.parse(out)).toEqual(hostile);
  });

  it('leaves ordinary text alone', () => {
    const plain = {
      '@type': 'Product',
      name: 'Black Embroidered Dhanak 3-Piece Suit',
      price: 4999,
    };
    expect(serializeJsonLd(plain)).toBe(JSON.stringify(plain));
  });
});
