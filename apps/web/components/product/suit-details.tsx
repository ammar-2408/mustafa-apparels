import { SEASON_LABELS } from '@mustafa/validators/taxonomy';
import Link from 'next/link';
import { type ReactNode, useId } from 'react';

import {
  availabilityLabel,
  formatPrice,
  pieceRow,
  piecesLabel,
  showCompareAt,
} from '../../lib/format';
import type { Suit } from '../../lib/types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-t border-border pt-6">
      <h2 id={id} className="caps-tight">
        {title}
      </h2>
      <div className="mt-4 text-body">{children}</div>
    </section>
  );
}

// The details column (docs/design.md §9.2 order): name, price and design code; the contact
// buttons (passed in); what's included; description; details; care when there is any.
export function SuitDetails({ suit, actions }: { suit: Suit; actions?: ReactNode }) {
  const stock = availabilityLabel(suit.availability);
  const details: [string, string | null][] = [
    ['Collection', suit.category.name],
    ['Fabric', suit.fabric],
    ['Colour', [suit.mainColor, ...suit.accentColors].filter(Boolean).join(', ') || null],
    ['Design', suit.design.join(', ') || null],
    ['Season', suit.season ? SEASON_LABELS[suit.season] : null],
    ['Style', suit.outfitStyle],
  ];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p className="caps-tight text-muted">
          <Link href={`/collections/${suit.category.slug}`} className="link">
            {suit.category.name}
          </Link>
          <span aria-hidden="true"> · </span>
          {piecesLabel(suit.pieces)}
        </p>
        <h1 className="text-h2 font-light">{suit.name}</h1>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {suit.price !== null && (
            <p className="text-body-lg">
              <span className="sr-only">Price </span>
              {formatPrice(suit.price)}
              {showCompareAt(suit.price, suit.compareAtPrice) && (
                <s className="ml-3 text-body text-muted">
                  <span className="sr-only">was </span>
                  {formatPrice(suit.compareAtPrice!)}
                </s>
              )}
            </p>
          )}
          {stock && (
            <span className="caps-tight rounded-sm bg-accent px-2 py-1 text-accent-fg">
              {stock}
            </span>
          )}
        </div>
        {suit.designCode && (
          <p className="text-small text-muted">
            Design code <span className="text-fg">{suit.designCode}</span>
          </p>
        )}
      </div>

      {actions}

      <Section title="What's included">
        <p className="mb-3 text-muted">
          An unstitched {suit.pieces === 'three_piece' ? '3-piece' : '2-piece'} suit: fabric for
          your tailor to stitch.
        </p>
        <ul className="flex flex-col gap-2">
          {suit.pieceDetails.map((piece) => (
            <li key={piece.piece}>{pieceRow(piece)}</li>
          ))}
        </ul>
      </Section>

      {suit.description && (
        <Section title="About this suit">
          <p>{suit.description}</p>
        </Section>
      )}

      <Section title="Details">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </Section>

      {suit.careInstructions && (
        <Section title="Care">
          <p className="whitespace-pre-line">{suit.careInstructions}</p>
        </Section>
      )}
    </div>
  );
}
