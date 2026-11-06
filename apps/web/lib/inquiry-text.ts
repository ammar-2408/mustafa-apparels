// The words a suit's contact buttons open with (docs/api.md, contact links). Pure and shared.
import { formatPrice } from './format';
import { canonicalUrl } from './seo';

type SuitRef = {
  name: string;
  slug: string;
  designCode: string | null;
  price: number | null;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
};

const label = (suit: SuitRef) =>
  [suit.designCode, suit.price !== null ? formatPrice(suit.price) : null]
    .filter(Boolean)
    .join(', ');

/** Hi! I'm interested in "<name>" (<code>, PKR <price>): <link>. Out of stock asks about it. */
export function whatsappText(suit: SuitRef) {
  const url = canonicalUrl(`/products/${suit.slug}`);
  const about = label(suit);
  const named = `"${suit.name}"${about ? ` (${about})` : ''}`;
  return suit.availability === 'out_of_stock'
    ? `Hi! Will ${named} be available again? ${url}`
    : `Hi! I'm interested in ${named}: ${url}`;
}

export function emailSubject(suit: SuitRef) {
  return `Question about ${suit.name}${suit.designCode ? ` (${suit.designCode})` : ''}`;
}

export function emailBody(suit: SuitRef) {
  return `Hi,\n\nI'd like to ask about this suit: ${canonicalUrl(`/products/${suit.slug}`)}\n\n`;
}

/** The main button's words: an out-of-stock suit keeps its page and asks about it instead. */
export const whatsappLabel = (suit: SuitRef) =>
  suit.availability === 'out_of_stock' ? 'Ask about this suit' : 'Order on WhatsApp';
