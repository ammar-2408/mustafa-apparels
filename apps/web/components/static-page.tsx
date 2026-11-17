import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { dmSerif } from '../app/fonts-serif';
import type { SiteArt } from '../lib/site-art';
import { breadcrumbList } from '../lib/structured-data';
import { JsonLd } from './json-ld';
import { LeafSprig, LotusRule } from './site/flourish';
import { HomeIcon } from './site/icons';

type Props = {
  /** The title; with `accent`, its last word is shown in deep orange (e.g. "About" + "Us"). */
  title: string;
  accent?: string;
  path: string;
  lead?: ReactNode;
  /** The page's picture, in a curved arch on the right from lg (the owner's mockups). */
  art?: SiteArt;
  children: ReactNode;
};

// About, Contact, How to Order, FAQ, Privacy and Terms (the owner's page mockups, 2026-11-17, in
// the site's colours): a breadcrumb with a home icon, the title in the serif with its last word in
// deep orange, the lotus between orange lines, the lead, the content, and the page's picture in a
// curved arch on the right. Privacy and Terms have no picture and keep text no wider than ~70ch.
export function StaticPage({ title, accent, path, lead, art, children }: Props) {
  const name = accent ? `${title} ${accent}` : title;
  return (
    <article
      className={`${dmSerif.variable} relative overflow-hidden bg-linear-to-b from-bg via-bg to-surface-soft/70`}
    >
      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name, path },
        ])}
      />
      {art && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] lg:block"
        >
          {/* The picture, clipped by a large ellipse on its left, with a thin orange arch. */}
          <div className="absolute inset-0 [clip-path:ellipse(85%_72%_at_100%_50%)]">
            <Image
              src={art.src}
              alt=""
              fill
              sizes="38vw"
              loading="eager"
              className="object-cover"
            />
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <ellipse
              cx="100"
              cy="50"
              rx="88"
              ry="74"
              fill="none"
              vectorEffect="non-scaling-stroke"
              className="stroke-accent"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      <div className="relative mx-auto max-w-content-wide px-gutter pt-10 pb-section md:pt-14">
        <div className={art ? 'lg:max-w-[58%]' : 'max-w-4xl'}>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-small">
              <li>
                <Link href="/" className="link inline-flex min-h-6 items-center gap-2">
                  <HomeIcon className="size-5" />
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted">
                /
              </li>
              <li>
                <span aria-current="page" className="text-accent-text">
                  {name}
                </span>
              </li>
            </ol>
          </nav>
          <h1 className="mt-6 font-serif text-h1 text-deep">
            {title}
            {accent && (
              <>
                {' '}
                <span className="text-accent-text">{accent}</span>
              </>
            )}
          </h1>
          <LotusRule className="mt-4" />
          {lead && <div className="mt-6 max-w-3xl text-body-lg">{lead}</div>}
          {art && (
            // Phones and tablets: the picture as a soft band under the title.
            <div
              aria-hidden="true"
              className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg lg:hidden"
            >
              <Image
                src={art.src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-[50%_70%]"
              />
            </div>
          )}
          <div className={`mt-12 flex flex-col gap-10 text-body ${art ? '' : 'max-w-prose'}`}>
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

export function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-h3 text-deep">{title}</h2>
      {children}
    </section>
  );
}

type Icon = (props: { className?: string }) => ReactNode;

// A card on an information page (About): an icon in a pale peach tile, a serif heading, the
// text, a short orange line and a faint leaf in the corner.
export function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: Icon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-lg border border-border bg-bg/80 p-6 shadow-soft md:p-8">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-accent/10 text-deep">
          <Icon className="size-7" />
        </span>
        <h2 className="font-serif text-h3 text-deep">{title}</h2>
      </div>
      <div className="relative flex flex-col gap-3">{children}</div>
      <span aria-hidden="true" className="mt-2 h-0.5 w-16 bg-accent" />
      <LeafSprig className="absolute right-2 bottom-2 w-20 opacity-40" />
    </section>
  );
}
