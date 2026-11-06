import { describe, expect, it } from 'vitest';

import {
  availabilityLabel,
  cardLine,
  formatPrice,
  pieceRow,
  piecesLabel,
  showCompareAt,
} from './format';

describe('prices', () => {
  it('shows whole rupees with commas', () => {
    expect(formatPrice(4999)).toBe('PKR 4,999');
    expect(formatPrice(125000)).toBe('PKR 125,000');
    expect(formatPrice(800)).toBe('PKR 800');
  });

  it('shows a compare-at price only when it is higher', () => {
    expect(showCompareAt(4999, 6500)).toBe(true);
    expect(showCompareAt(4999, 4999)).toBe(false);
    expect(showCompareAt(4999, null)).toBe(false);
    expect(showCompareAt(null, 6500)).toBe(false);
  });
});

describe('suit text', () => {
  it('names the pieces', () => {
    expect(piecesLabel('three_piece')).toBe('3 Piece');
    expect(piecesLabel('two_piece')).toBe('2 Piece');
  });

  it('puts the shirt finish before the fabric, or just the fabric', () => {
    const shirt = { piece: 'shirt' as const, fabric: 'Dhanak', finish: 'Embroidered' };
    expect(cardLine({ pieceDetails: [shirt], fabric: 'Dhanak' })).toBe('Embroidered · Dhanak');
    expect(cardLine({ pieceDetails: [], fabric: 'Khaddar' })).toBe('Khaddar');
  });

  it('writes each piece out in full, with length only when given', () => {
    expect(pieceRow({ piece: 'shirt', fabric: 'Dhanak', finish: 'Embroidered', length_m: 3 })).toBe(
      'Shirt: Dhanak, embroidered, 3 m',
    );
    expect(pieceRow({ piece: 'trouser', finish: 'Plain dyed' })).toBe('Trouser: Plain dyed');
    expect(pieceRow({ piece: 'dupatta' })).toBe('Dupatta: included');
  });

  it('labels stock only when the owner set it low or out', () => {
    expect(availabilityLabel('in_stock')).toBeNull();
    expect(availabilityLabel('low_stock')).toBe('Few left');
    expect(availabilityLabel('out_of_stock')).toBe('Out of stock');
  });
});
