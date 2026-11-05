import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { crossChecks, leftOutFiles, loadCatalog, splitFrontMatter } from './catalog';

const CATALOG = fileURLToPath(new URL('../../catalog', import.meta.url));

describe('the real catalog/', () => {
  const catalog = loadCatalog(CATALOG);

  it('is valid: every rule in docs/catalog.md §3 and §4', () => {
    expect(catalog.problems).toEqual([]);
  });

  it('has the 3 collections and 30 suits', () => {
    expect(catalog.collections.map((c) => c.collection)).toEqual(['dhanak', 'khaddar', 'lajwanti']);
    const count = (c: string) => catalog.suits.filter((s) => s.collection === c).length;
    expect([count('dhanak'), count('khaddar'), count('lajwanti')]).toEqual([12, 13, 5]);
  });

  it('lists the 3 left-out videos', () => {
    expect(catalog.collections.flatMap((c) => c.leftOut).sort()).toEqual([
      'Dhanak/dhnk1-VID.mp4',
      'Lajwanti/Laj1vid.mp4',
      'Lajwanti/laj3vid.mp4',
    ]);
  });

  it('never has a price or a status other than draft', () => {
    expect(catalog.suits.every((s) => s.price === null && s.status === 'draft')).toBe(true);
  });
});

describe('splitFrontMatter', () => {
  it('reads YAML and the body, with an empty price as null', () => {
    expect(splitFrontMatter('---\nprice:\nname: A\n---\nBody text.\n')).toEqual({
      data: { price: null, name: 'A' },
      body: 'Body text.',
    });
    expect(splitFrontMatter('---\r\nname: A\r\n---\r\nBody\r\n').body).toBe('Body');
  });

  it('refuses a file with no front matter', () => {
    expect(() => splitFrontMatter('name: A')).toThrow(/front matter/);
  });
});

describe('leftOutFiles', () => {
  it('reads the backticked files under "## Left out" only', () => {
    const body =
      '## Suits\n\n- `Dhanak/a.jpeg` kept\n\n## Left out\n\n- `Dhanak/b.mp4`: end card.\n- `Dhanak/c.mp4`: same.\n\nVideos were checked.';
    expect(leftOutFiles(body)).toEqual(['Dhanak/b.mp4', 'Dhanak/c.mp4']);
    expect(leftOutFiles('## Left out\n\nNothing.')).toEqual([]);
  });
});

describe('crossChecks', () => {
  const collections = [{ collection: 'dhanak', prefix: 'DHN' }];
  const suit = (id: string, links: string[] = [], extra = {}) => ({
    path: `catalog/dhanak/${id.toLowerCase()}.md`,
    design_id: id,
    name: `Suit ${id}`,
    slug: `suit-${id.toLowerCase()}`,
    collection: 'dhanak',
    also_in_this_design: links,
    ...extra,
  });

  it('passes linked suits that list each other', () => {
    expect(
      crossChecks(collections, [suit('DHN-01', ['DHN-02']), suit('DHN-02', ['DHN-01'])]),
    ).toEqual([]);
  });

  it('finds one-way and broken links', () => {
    expect(crossChecks(collections, [suit('DHN-01', ['DHN-02']), suit('DHN-02')])).toEqual([
      'catalog/dhanak/dhn-01.md: DHN-02 must list DHN-01 back',
    ]);
    expect(crossChecks(collections, [suit('DHN-01', ['DHN-09'])])).toEqual([
      'catalog/dhanak/dhn-01.md: also_in_this_design names DHN-09, which has no file',
    ]);
  });

  it('finds a file listed twice in one suit', () => {
    const twice = {
      ...suit('DHN-01'),
      photos: [{ file: 'Dhanak/a.jpeg' }, { file: 'Dhanak/a.jpeg' }],
      videos: [],
    };
    expect(crossChecks(collections, [twice])).toEqual([
      'catalog/dhanak/dhn-01.md: Dhanak/a.jpeg is listed twice',
    ]);
  });

  it('finds a reused ID, name or slug, and a wrong prefix or collection', () => {
    const problems = crossChecks(collections, [
      suit('DHN-01'),
      suit('DHN-02', [], { name: 'suit dhn-01', slug: 'suit-dhn-01' }),
      suit('KDR-03'),
      suit('DHN-04', [], { collection: 'lawn' }),
    ]);
    expect(problems).toEqual([
      'catalog/dhanak/dhn-02.md: name "suit dhn-01" is also used by catalog/dhanak/dhn-01.md',
      'catalog/dhanak/dhn-02.md: slug "suit-dhn-01" is also used by catalog/dhanak/dhn-01.md',
      'catalog/dhanak/kdr-03.md: design_id must start with DHN-',
      'catalog/dhanak/dhn-04.md: no _collection.md for "lawn"',
    ]);
  });
});

describe('loadCatalog on a broken folder', () => {
  let root: string;
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('reports a missing _collection.md, a bad file name and a schema problem', () => {
    root = mkdtempSync(join(tmpdir(), 'catalog-'));
    mkdirSync(join(root, 'dhanak'));
    writeFileSync(join(root, 'dhanak', 'wrong.md'), '---\ndesign_id: DHN-01\n---\nBody\n');
    writeFileSync(join(root, 'dhanak', 'notes.md'), 'no front matter');
    const { problems } = loadCatalog(root);
    expect(problems).toContainEqual('catalog/dhanak: missing _collection.md');
    expect(problems).toContainEqual(
      'catalog/dhanak/notes.md: No front matter: the file must start with a --- block',
    );
    expect(problems.some((p) => p.startsWith('catalog/dhanak/wrong.md: collection:'))).toBe(true);
  });
});
