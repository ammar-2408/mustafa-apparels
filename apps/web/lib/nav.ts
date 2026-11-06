// The storefront's menu and footer links (docs/design.md §9.2): short and collections first.
// Pure, so the header, the side panel and the footer share one list and one test.

export type NavLink = { href: string; label: string };
type CollectionRef = { slug: string; name: string };

export function menuLinks(collections: CollectionRef[]): NavLink[] {
  return [
    { href: '/#new-arrivals', label: 'New arrivals' },
    ...collections.map((c) => ({ href: `/collections/${c.slug}`, label: c.name })),
    { href: '/shop', label: 'All suits' },
    { href: '/how-to-order', label: 'How to Order' },
  ];
}

// Smaller links under the main ones in the panel, and the footer's help column.
export const HELP_LINKS: NavLink[] = [
  { href: '/how-to-order', label: 'How to Order' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
];

export const LEGAL_LINKS: NavLink[] = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

type Socials = { instagram?: string; facebook?: string; tiktok?: string; youtube?: string };
const SOCIAL_NAMES: Record<keyof Socials, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

// Only the profiles the owner has set in admin; none means no social row at all.
export function socialLinks(socials: Socials | null | undefined): NavLink[] {
  if (!socials) return [];
  return (Object.keys(SOCIAL_NAMES) as (keyof Socials)[]).flatMap((key) =>
    socials[key] ? [{ href: socials[key], label: SOCIAL_NAMES[key] }] : [],
  );
}

// The greeting a general WhatsApp button opens with (a suit's own button names the suit, step 6.7).
export const GENERAL_WHATSAPP_TEXT = "Hi! I'd like to ask about your unstitched suits.";
