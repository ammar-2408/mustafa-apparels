// Reads catalog/ (docs/catalog.md §3): every <collection>/_collection.md and <design-id>.md,
// checked one by one with the Zod schemas, then across files. Only reads catalog/, never
// "Business data/".
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type CollectionFile,
  collectionFile,
  DESIGN_ID,
  type SuitFile,
  suitFile,
} from '@mustafa/validators/catalog';
import { parse } from 'yaml';

export type CatalogSuit = SuitFile & { path: string };
export type CatalogCollection = CollectionFile & { path: string; leftOut: string[] };

export type Catalog = {
  collections: CatalogCollection[];
  suits: CatalogSuit[];
  problems: string[];
};

// YAML front matter between two "---" lines, then the Markdown body.
export function splitFrontMatter(text: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('No front matter: the file must start with a --- block');
  return { data: parse(match[1]!) ?? {}, body: match[2]!.trim() };
}

// Files named in backticks under "## Left out", relative to Business data/Stock.
export function leftOutFiles(body: string): string[] {
  const section = /^## Left out\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body)?.[1] ?? '';
  return [...section.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]!);
}

// The part of a Zod schema used here (zod itself isn't a dependency of scripts/).
type Issue = { path: PropertyKey[]; message: string };
type Schema<T> = {
  safeParse(
    data: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: Issue[] } };
};

const describeIssues = (path: string, issues: Issue[]) =>
  issues.map(
    (issue) => `${path}: ${issue.path.map(String).join('.') || '(file)'}: ${issue.message}`,
  );

function readOne<T>(file: string, path: string, schema: Schema<T>, problems: string[]): T | null {
  let parsed: { data: unknown; body: string };
  try {
    parsed = splitFrontMatter(readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  const data =
    parsed.data && typeof parsed.data === 'object' ? { ...parsed.data, body: parsed.body } : {};
  const result = schema.safeParse(data);
  if (!result.success) {
    problems.push(...describeIssues(path, result.error.issues));
    return null;
  }
  return result.data;
}

export function loadCatalog(root: string): Catalog {
  const problems: string[] = [];
  const collections: CatalogCollection[] = [];
  const suits: CatalogSuit[] = [];

  const folders = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of folders) {
    const files = readdirSync(join(root, folder))
      .filter((f) => f.endsWith('.md'))
      .sort();
    const display = (file: string) => `catalog/${folder}/${file}`;
    if (!files.includes('_collection.md')) {
      problems.push(`catalog/${folder}: missing _collection.md`);
    }
    for (const file of files) {
      const path = join(root, folder, file);
      if (file === '_collection.md') {
        const found = readOne(path, display(file), collectionFile, problems);
        if (!found) continue;
        if (found.collection !== folder) {
          problems.push(
            `${display(file)}: collection is "${found.collection}", folder is "${folder}"`,
          );
        }
        collections.push({ ...found, path: display(file), leftOut: leftOutFiles(found.body) });
        continue;
      }
      const found = readOne(path, display(file), suitFile, problems);
      if (!found) continue;
      if (file !== `${found.design_id.toLowerCase()}.md`) {
        problems.push(`${display(file)}: name the file ${found.design_id.toLowerCase()}.md`);
      }
      if (found.collection !== folder) {
        problems.push(
          `${display(file)}: collection is "${found.collection}", folder is "${folder}"`,
        );
      }
      suits.push({ ...found, path: display(file) });
    }
  }

  problems.push(...crossChecks(collections, suits));
  return { collections, suits, problems };
}

// Rules that need every file: unique IDs, names and slugs, the right prefix, two-way links.
export function crossChecks(
  collections: Pick<CatalogCollection, 'collection' | 'prefix'>[],
  suits: (Pick<
    CatalogSuit,
    'path' | 'design_id' | 'name' | 'slug' | 'collection' | 'also_in_this_design'
  > & { photos?: { file: string }[]; videos?: { file: string }[] })[],
): string[] {
  const problems: string[] = [];
  const prefixes = new Map(collections.map((c) => [c.collection, c.prefix]));

  for (const key of ['design_id', 'name', 'slug'] as const) {
    const seen = new Map<string, string>();
    for (const suit of suits) {
      const value = key === 'design_id' ? suit[key] : suit[key].toLowerCase();
      const first = seen.get(value);
      if (first) problems.push(`${suit.path}: ${key} "${suit[key]}" is also used by ${first}`);
      else seen.set(value, suit.path);
    }
  }

  // One file once per suit: the import gives each file one id, so a repeat would clash.
  for (const suit of suits) {
    const files = [...(suit.photos ?? []), ...(suit.videos ?? [])].map((m) => m.file);
    for (const file of new Set(files.filter((f, i) => files.indexOf(f) !== i))) {
      problems.push(`${suit.path}: ${file} is listed twice`);
    }
  }

  const byId = new Map(suits.map((s) => [s.design_id, s]));
  for (const suit of suits) {
    const prefix = prefixes.get(suit.collection);
    if (prefix === undefined) {
      problems.push(`${suit.path}: no _collection.md for "${suit.collection}"`);
    } else if (DESIGN_ID.exec(suit.design_id)?.[1] !== prefix) {
      problems.push(`${suit.path}: design_id must start with ${prefix}-`);
    }
    for (const other of suit.also_in_this_design) {
      const linked = byId.get(other);
      if (!linked)
        problems.push(`${suit.path}: also_in_this_design names ${other}, which has no file`);
      else if (!linked.also_in_this_design.includes(suit.design_id)) {
        problems.push(`${suit.path}: ${other} must list ${suit.design_id} back`);
      }
    }
  }
  return problems;
}
