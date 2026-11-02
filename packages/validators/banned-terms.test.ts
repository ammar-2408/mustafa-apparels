import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BANNED_TERMS, findBannedTerm, noBannedTerms } from './banned-terms';

describe('BANNED_TERMS', () => {
  it('lists the brands in docs/database.md §9', () => {
    expect([...BANNED_TERMS].sort()).toEqual(
      [
        'Baroque',
        'Elaf',
        'HS Fashion',
        'Khaadi',
        'Maria B',
        'Nishat',
        'So Kamal',
        'Sobia Waseem',
      ].sort(),
    );
  });
});

describe('findBannedTerm', () => {
  it.each([
    ['Elaf', 'Elaf'],
    ['BAROQUE', 'Baroque'],
    ['khaadi', 'Khaadi'],
    ['Maria B', 'Maria B'],
    ['Maria.B', 'Maria B'],
    ['maria b', 'Maria B'],
    ['MariaB', 'Maria B'],
    ['MARIAB', 'Maria B'],
    ['maria-b', 'Maria B'],
    ['HS Fashion', 'HS Fashion'],
    ['HS-Fashion', 'HS Fashion'],
    ['hsfashion', 'HS Fashion'],
    ['Sobia Waseem', 'Sobia Waseem'],
    ['sobia.waseem', 'Sobia Waseem'],
    ['Nishat', 'Nishat'],
    ['Nishat Linen', 'Nishat'],
    ['So Kamal', 'So Kamal'],
    ['so-kamal', 'So Kamal'],
    ['SOKAMAL', 'So Kamal'],
    ['SoKamal', 'So Kamal'],
  ])('finds "%s" as %s', (text, term) => {
    expect(findBannedTerm(text)).toBe(term);
  });

  it('finds a name inside longer text', () => {
    expect(findBannedTerm('Same print as the Khaadi winter range')).toBe('Khaadi');
    expect(findBannedTerm('lawn by maria.b, 3 piece')).toBe('Maria B');
  });

  it('sees through accents, zero-width spaces and full-width letters', () => {
    expect(findBannedTerm('Khäadi')).toBe('Khaadi');
    expect(findBannedTerm('Kha\u200Badi')).toBe('Khaadi');
    expect(findBannedTerm('Ｅｌａｆ')).toBe('Elaf');
  });

  it.each([
    'Khaddar',
    'khadi',
    'Black Embroidered Khaddar 3-Piece Suit',
    'also Kamal',
    'Mariam',
    'Maria Bashir',
    'Nishatabad',
    'Sobia',
    'Hs',
    'fashion',
    'Elafa',
    '',
  ])('lets "%s" through', (text) => {
    expect(findBannedTerm(text)).toBeNull();
  });

  it('passes every real file in catalog/', () => {
    const root = fileURLToPath(new URL('../../catalog/', import.meta.url));
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((f) =>
      f.endsWith('.md'),
    );
    expect(files.length).toBeGreaterThanOrEqual(33);
    for (const file of files) {
      expect([file, findBannedTerm(readFileSync(join(root, file), 'utf8'))]).toEqual([file, null]);
    }
  });
});

describe('noBannedTerms', () => {
  it('rejects a banned name with a message the admin can act on', () => {
    const result = noBannedTerms(z.string()).safeParse('Copy of Khaadi print');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Remove the brand name “Khaadi”');
  });

  it('keeps the wrapped schema’s own rules and output', () => {
    const name = noBannedTerms(z.string().trim().min(2));
    expect(name.safeParse('  Black Dhanak Suit ').data).toBe('Black Dhanak Suit');
    expect(name.safeParse('a').success).toBe(false);
  });

  it('checks every item in an array', () => {
    const motifs = z.array(noBannedTerms(z.string()));
    expect(motifs.safeParse(['paisley', 'peacock']).success).toBe(true);
    const result = motifs.safeParse(['paisley', 'So Kamal style']);
    expect(result.error?.issues[0]?.path).toEqual([1]);
  });
});
