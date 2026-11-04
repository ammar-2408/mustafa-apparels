// A URL slug from a name: lowercase letters, digits and single hyphens (the `slug` rule in
// packages/validators/common.ts). The form fills it in until the owner edits it by hand.
export function slugify(text: string, max = 140): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}
