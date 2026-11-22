import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { dmSerif } from '../app/fonts-serif';
import { SITE_ART, type SiteArt } from '../lib/site-art';
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
  /**
   * Privacy and Terms (owner's NEWPRIVACY.png and NEWTERMS.png, 2026-11-22): fabric on the right
   * behind a curve with a thin gold line, soft leaves at the top (left or right), a green and
   * orange wave at the bottom left, and a chevron in the breadcrumb.
   */
  sideArt?: SiteArt;
  leaves?: 'left' | 'right';
  children: ReactNode;
};

// The curve's shape, in the picture's own box (0 to 1): from the top right down to the bottom left.
const CURVE = 'M1,0.09 C0.78,0.25 0.55,0.44 0.46,0.6 S0.25,0.92 0.1,1';

// About, Contact, How to Order, FAQ, Privacy and Terms (the owner's page mockups, 2026-11-17, in
// the site's colours): a breadcrumb with a home icon, the title in the serif with its last word in
// deep orange, the lotus between orange lines, the lead, the content, and the page's picture in a
// curved arch on the right. Privacy and Terms have no picture and keep text no wider than ~70ch.
export function StaticPage({
  title,
  accent,
  path,
  lead,
  art,
  sideArt,
  leaves = 'right',
  children,
}: Props) {
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

      {sideArt && (
        <div aria-hidden="true" className="pointer-events-none">
          <svg className="absolute size-0">
            <clipPath id="policy-curve" clipPathUnits="objectBoundingBox">
              <path d={`${CURVE} L1,1 Z`} />
            </clipPath>
          </svg>
          <div className="absolute top-0 right-0 hidden h-[calc(100svh-6rem)] w-[24%] lg:block">
            <div className="absolute inset-0 [clip-path:url(#policy-curve)]">
              <Image
                src={sideArt.src}
                alt=""
                fill
                sizes="24vw"
                loading="eager"
                className="object-cover object-right-bottom"
              />
            </div>
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <path
                d={CURVE}
                className="fill-none stroke-gold"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <Image
            src={SITE_ART.authLeaves.src}
            alt=""
            width={262}
            height={315}
            sizes="16rem"
            style={{
              maskImage: `radial-gradient(ellipse at 50% 35%, black 25%, transparent 70%)`,
            }}
            className={`absolute top-0 w-40 mix-blend-multiply sm:w-56 ${leaves === 'left' ? 'left-0 -scale-x-100' : 'right-0 lg:right-[18%]'}`}
          />
          {/* A deep green wave edged in orange along the bottom left. */}
          <svg
            viewBox="0 0 600 60"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 h-10 w-2/3 md:h-14 lg:w-1/2"
          >
            <path d="M0 60V28C150 4 320 14 600 60z" className="fill-deep" />
            <path
              d="M0 22C160 -2 330 8 600 54"
              className="fill-none stroke-accent"
              strokeWidth="4"
            />
          </svg>
        </div>
      )}

      <div
        className={`relative mx-auto max-w-content-wide px-gutter pb-section ${sideArt ? 'pt-[clamp(1rem,3svh,3.5rem)]' : 'pt-10 md:pt-14'}`}
      >
        <div
          className={art ? 'lg:max-w-[58%]' : sideArt ? 'max-w-5xl lg:max-w-[76%]' : 'max-w-4xl'}
        >
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-small">
              <li>
                <Link href="/" className="link inline-flex min-h-6 items-center gap-2">
                  <HomeIcon className="size-5" />
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted">
                {sideArt ? (
                  <svg data-separator="chevron" viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                ) : (
                  '/'
                )}
              </li>
              <li>
                <span aria-current="page" className="text-accent-text">
                  {name}
                </span>
              </li>
            </ol>
          </nav>
          <h1
            className={`font-serif text-deep ${sideArt ? 'mt-[clamp(0.5rem,1.6svh,1.5rem)] text-[clamp(2.25rem,7svh,5rem)] leading-[1.05]' : 'mt-6 text-h1'}`}
          >
            {title}
            {accent && (
              <>
                {' '}
                <span className="text-accent-text">{accent}</span>
              </>
            )}
          </h1>
          <LotusRule className={sideArt ? 'mt-[clamp(0.5rem,1.4svh,1rem)]' : 'mt-4'} />
          {lead && (
            <div
              className={`max-w-3xl text-body-lg ${sideArt ? 'mt-[clamp(0.5rem,1.8svh,1.5rem)]' : 'mt-6'}`}
            >
              {lead}
            </div>
          )}
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
          <div
            className={`flex flex-col gap-10 text-body ${sideArt ? 'mt-[clamp(1rem,3svh,3rem)]' : 'mt-12'} ${art || sideArt ? '' : 'max-w-prose'}`}
          >
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

// A point on Privacy or Terms (owner's NEWPRIVACY.png and NEWTERMS.png, 2026-11-22): a white card
// with a deep green lower edge, an icon in a raised pale peach tile, a short orange divider, then
// the serif heading and the text.
export function PolicyCard({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex items-center gap-4 rounded-lg border border-border border-b-deep bg-bg/90 p-5 shadow-soft [border-bottom-width:3px] sm:gap-6 sm:px-6 sm:py-[clamp(1rem,2.4svh,1.5rem)] ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-deep shadow-soft sm:size-20 [&_svg]:size-8 sm:[&_svg]:size-10"
      >
        {icon}
      </span>
      <span aria-hidden="true" className="w-0.5 self-stretch bg-accent" />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="font-serif text-h3 text-deep">{title}</h2>
        <div className="text-body">{children}</div>
      </div>
    </section>
  );
}
