// How suits are described on cards and pages (docs/design.md §9.2). Pure and shared.
import type { PieceDetail } from '@mustafa/db/schema';

/** Whole rupees with commas: PKR 4,999. Same output on server and browser. */
export const formatPrice = (rupees: number) =>
  `PKR ${String(Math.round(rupees)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/** A compare-at price shows only when it is higher than the price. */
export const showCompareAt = (price: number | null, compareAt: number | null) =>
  price !== null && compareAt !== null && compareAt > price;

export const piecesLabel = (pieces: 'two_piece' | 'three_piece') =>
  pieces === 'three_piece' ? '3 Piece' : '2 Piece';

/** The small line above a card's name: the shirt's finish and the fabric, e.g. Embroidered · Dhanak. */
export function cardLine({
  pieceDetails,
  fabric,
}: {
  pieceDetails: PieceDetail[];
  fabric: string;
}) {
  const finish = pieceDetails.find((p) => p.piece === 'shirt')?.finish;
  return finish ? `${finish} · ${fabric}` : fabric;
}

const PIECE_NAMES: Record<PieceDetail['piece'], string> = {
  shirt: 'Shirt',
  dupatta: 'Dupatta',
  trouser: 'Trouser',
};

/** One "What's included" row, with no abbreviations: Shirt: Dhanak, embroidered, 3 m. */
export function pieceRow(detail: PieceDetail) {
  const parts = [
    detail.fabric,
    detail.finish && (detail.fabric ? detail.finish.toLowerCase() : detail.finish),
    detail.length_m !== undefined ? `${detail.length_m} m` : undefined,
  ].filter(Boolean);
  return `${PIECE_NAMES[detail.piece]}: ${parts.length > 0 ? parts.join(', ') : 'included'}`;
}

type Availability = 'in_stock' | 'low_stock' | 'out_of_stock';
/** Only the owner's own stock setting, never a guess. In stock says nothing. */
export const availabilityLabel = (availability: Availability) =>
  availability === 'out_of_stock'
    ? 'Out of stock'
    : availability === 'low_stock'
      ? 'Few left'
      : null;

// The collections as a phrase for running text: "Dhanak, Khaddar and Lajwanti". Past three it adds
// "and more", so new collections from admin never make the sentence long (owner, 2026-11-15).
export function collectionList(names: string[]) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length > 3) return `${names.slice(0, 3).join(', ')} and more`;
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
