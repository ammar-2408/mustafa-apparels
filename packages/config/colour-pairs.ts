// Every colour pairing the brand allows (docs/design.md §1.2). Tokens live in
// tailwind/theme.css; test/tailwind-theme.test.mjs checks each pair against WCAG 2.2 AA, and
// test/colour-usage.test.mjs checks that components only use pairs from this list.
// To use a new pairing, add it here first: if it doesn't reach its minimum, the build fails.

export type Role = 'text' | 'large-text' | 'ui';

// WCAG 2.2 AA: 4.5:1 for text, 3:1 for large text (24px, or 18.66px Light) and UI parts.
export const MINIMUM: Record<Role, number> = { text: 4.5, 'large-text': 3, ui: 3 };

export type Pair = readonly [foreground: string, background: string, role: Role, use: string];

export const ALLOWED_PAIRS: readonly Pair[] = [
  // Text. Ink is the only text colour on powder blue.
  ['fg', 'bg', 'text', 'All text on the white page'],
  ['fg', 'surface', 'text', 'Text in form fields and white cards'],
  ['fg', 'surface-soft', 'text', 'The few words in an empty photo box ("Photo coming soon")'],
  ['primary-fg', 'primary', 'text', 'Text on the header band, sections, cards, footer, sidebar'],
  ['fg', 'teal', 'text', 'All footer text: ink only on the deeper teal (7.87:1)'],
  [
    'action-fg',
    'deep',
    'text',
    'White on deep green: hero button, filled How to Order cards (10:1)',
  ],
  ['deep', 'bg', 'text', 'Deep green label of the WhatsApp button in the hero (10:1)'],
  ['deep', 'surface-soft', 'text', 'Deep green label on the pale hero band (8.99:1)'],
  ['muted', 'bg', 'text', 'Secondary text, on white only'],
  ['muted', 'surface', 'text', 'Hints and help text in white fields'],
  ['muted', 'surface-soft', 'text', 'Taglines on the Shop by Fabric cards and the home hero text'],
  ['accent-text', 'surface-soft', 'large-text', 'The orange line of the home hero headline only'],
  ['action-fg', 'action', 'text', 'Main button labels: white on ink'],
  ['accent-fg', 'accent', 'text', 'Badges such as "New" and sale: ink on orange'],
  ['accent-text', 'bg', 'text', 'Small orange text such as links, on white only'],
  ['accent-text', 'surface', 'text', 'Small orange text in white cards'],
  ['error', 'bg', 'text', 'Error messages, on white only'],
  ['error', 'surface', 'text', 'Field errors'],
  ['success', 'bg', 'text', 'Success messages, on white only'],
  ['success', 'surface', 'text', 'Success notes in white fields'],

  // UI parts: borders, focus rings, underlines, small icons.
  ['border-strong', 'bg', 'ui', 'Form field and control borders'],
  ['border-strong', 'surface', 'ui', 'Form field borders'],
  ['accent', 'bg', 'ui', 'Focus ring, hover underline and small icons on white'],
  ['accent', 'surface', 'ui', 'Focus ring on white fields'],
  ['accent', 'action', 'ui', 'Small orange icons on ink'],
  ['accent', 'deep', 'ui', 'Orange underlines on a filled How to Order card (3.02:1)'],
  ['accent-text', 'surface-soft', 'ui', 'Orange icons and underlines on the Shop by Fabric cards'],
  ['accent-text', 'bg', 'ui', 'Orange icons, ornaments and the swash on white (menu, headings)'],
  ['fg', 'primary', 'ui', 'Focus ring on powder blue (orange is too faint there)'],
  ['action', 'bg', 'ui', 'Button edges on white'],
  ['error', 'surface', 'ui', 'Invalid field borders'],
];

// Tokens that are only ever a surface or a decorative line, never text or a needed UI part.
// `gloss` is the shine at the top of the buttons: the label sits lower, on the deep green.
// `gold` is a thin decorative line along curved picture edges.
export const SURFACE_ONLY = ['primary', 'border', 'gloss', 'gold'] as const;

// Pairings that must never be allowed: each one fails AA, and some look tempting.
export const FORBIDDEN_TEXT: readonly (readonly [string, string])[] = [
  ['primary', 'bg'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent-text', 'primary'],
  ['muted', 'primary'],
  ['error', 'primary'],
  ['success', 'primary'],
  ['action-fg', 'accent'],
  // The footer teal: ink only. Orange there is decoration (short underlines), never text or icons.
  ['accent', 'teal'],
  ['accent-text', 'teal'],
  ['muted', 'teal'],
  ['accent-text', 'deep'],
];
