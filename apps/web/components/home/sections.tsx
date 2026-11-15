import { whatsappLink } from '@mustafa/core/contact-links';
import { shapedImageUrl } from '@mustafa/core/media-url';
import { buttonClass } from '@mustafa/ui/button';
import { Logo } from '@mustafa/ui/logo';
import Image from 'next/image';
import Link from 'next/link';

import { collectionList } from '../../lib/format';
import { DELIVERY_WHATSAPP_TEXT, GENERAL_WHATSAPP_TEXT } from '../../lib/nav';
import type { SiteArt } from '../../lib/site-art';
import type { Collection, SuitCard } from '../../lib/types';
import { Carousel } from '../carousel/carousel';
import { revealDelay } from '../motion/reveal';
import { ProductCard } from '../product/product-card';
import {
  Eyebrow,
  FlowerSprig,
  LeafBranch,
  LeafSprig,
  LotusOrnament,
  Swash,
  Wave,
} from '../site/flourish';
import {
  ArrowIcon,
  ChevronIcon,
  collectionIcon,
  LayersIcon,
  LotusIcon,
  ShirtIcon,
  SuitHeartIcon,
  TruckIcon,
  WhatsAppIcon,
} from '../site/icons';

const wrap = 'mx-auto max-w-content-wide px-gutter';

// 1. Hero (the owner's `finalhero.png`, 2026-11-15): centred on soft mint, no picture. The MA
// submark, the shop's name between rules, the Bold headline with a deep orange second line, the
// collections from admin (so new ones need no code change) and the two deep green buttons. At least
// one screen tall (minus the navbar's fixed height), so nothing below shows on load.
export function Hero({
  whatsapp,
  collections,
}: {
  whatsapp: string | null;
  collections: string[];
}) {
  const names = collectionList(collections);
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-linear-to-b from-surface-soft via-surface-soft to-primary/25 text-fg md:min-h-[calc(100svh-5rem)] lg:min-h-[calc(100svh-6rem)]"
    >
      {/* Soft sweeps of colour in two corners, as in the mockup. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 800"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path className="fill-primary/15" d="M0 0h620C470 70 250 150 0 300z" />
        <path className="fill-bg/50" d="M0 0h360C250 60 120 110 0 150z" />
        <path className="fill-primary/15" d="M1440 800H700c300-40 540-170 740-360z" />
        <path className="fill-bg/50" d="M1440 800H1020c190-30 330-110 420-210z" />
      </svg>
      <LeafSprig className="absolute top-6 right-2 w-32 -scale-x-100 md:w-48 lg:w-56" />
      <LeafSprig className="absolute bottom-2 left-0 hidden w-40 md:block lg:w-48" />

      <div
        className={`${wrap} relative z-10 flex w-full flex-col items-center gap-6 py-16 text-center md:gap-7`}
      >
        <Logo variant="submark" height={48} />
        <p className="flex items-center gap-4 caps-tight text-fg sm:caps">
          <span aria-hidden="true" className="h-px w-10 bg-deep/60 sm:w-16" />
          Mustafa Apparels
          <span aria-hidden="true" className="h-px w-10 bg-deep/60 sm:w-16" />
        </p>
        <h1 id="hero-title" className="hero-title text-hero font-bold">
          <span className="block">Elegant Unstitched Suits,</span>{' '}
          <span className="block text-accent-text">Made for Every Occasion</span>
        </h1>
        <p className="reveal max-w-4xl text-body-lg" style={revealDelay(1)}>
          Premium unstitched 2-piece and 3-piece suits{names ? ` in ${names}` : ''}.{' '}
          <br className="hidden md:block" />
          Choose your favourite fabric, order on WhatsApp, and get delivery anywhere in Pakistan.
        </p>
        <div
          className="reveal mt-2 flex flex-wrap justify-center gap-4 md:gap-6"
          style={revealDelay(2)}
        >
          <Link href="/shop" className={buttonClass('deep', 'min-w-56', 'bold')}>
            See All Suits
            <ArrowIcon className="nudge size-5" />
          </Link>
          {whatsapp && (
            <a
              href={whatsappLink(whatsapp, GENERAL_WHATSAPP_TEXT)}
              className={buttonClass('deep-outline', 'min-w-56', 'bold')}
              target="_blank"
              rel="noopener"
            >
              <WhatsAppIcon className="size-5" />
              WhatsApp Us
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

const ABOUT_POINTS = [
  { Icon: ShirtIcon, title: 'Women’s Suits', text: 'Elegant collections' },
  { Icon: LayersIcon, title: 'Premium Fabrics', text: 'Carefully selected' },
  { Icon: WhatsAppIcon, title: 'Order on WhatsApp', text: 'Quick & convenient' },
];

// 2. About (the owner's mockup, 2026-11-15): the plain facts about the shop (docs/seo-geo.md §7),
// three short points, and the fabric picture. The heading reads as one sentence for search.
export function About({ art }: { art: SiteArt }) {
  return (
    // Like the hero: the text on the left, the picture filling the right side top to bottom
    // (the owner's "Crafted in Style" mockup, 2026-11-15).
    <section
      aria-labelledby="about-title"
      className="relative flex flex-col overflow-hidden bg-linear-to-r from-bg via-bg to-surface-soft lg:block"
    >
      <div className={`${wrap} relative z-10 w-full`}>
        <div className="flex min-w-0 flex-col gap-6 py-16 md:py-24 lg:w-[54%] lg:py-28 lg:pr-8">
          <Eyebrow label="About Mustafa Apparels" align="start" />
          <h2 id="about-title" className="reveal text-h2 font-bold text-wrap">
            <span className="block">Mustafa Apparels is an</span>{' '}
            <span className="block text-accent-text">online shop for women’s</span>{' '}
            <span className="block">unstitched suits in Pakistan.</span>
          </h2>
          <Swash className="h-3 w-44" />
          <p className="reveal max-w-xl text-body-lg" style={revealDelay(1)}>
            Every suit comes as fabric for your own tailor, and every order is arranged with you on
            WhatsApp.
          </p>
          <ul
            className="reveal mt-2 grid max-w-2xl grid-cols-3 divide-x divide-border"
            style={revealDelay(2)}
          >
            {ABOUT_POINTS.map(({ Icon, title, text }) => (
              <li key={title} className="flex flex-col items-center gap-2 px-2 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-surface-soft">
                  <Icon className="size-7" />
                </span>
                <span className="text-small font-bold">{title}</span>
                <span className="text-small text-muted">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        style={revealDelay(1)}
        className="reveal relative aspect-[1071/724] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[46%]"
      >
        <Image
          src={art.src}
          alt={art.alt}
          fill
          sizes="(min-width: 64rem) 46vw, 100vw"
          className="object-cover"
        />
        {/* Fades the picture into the page, so the text side stays calm. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-1/4 bg-linear-to-r from-bg lg:block"
        />
      </div>
    </section>
  );
}

// About 1.3 cards on phones (the next one peeks in), 2 on tablets, 3 on laptops, 4 from 1440px.
const ARRIVAL_WIDTHS =
  'w-[76%] md:w-[calc((100%_-_24px)/2)] lg:w-[calc((100%_-_48px)/3)] min-[90rem]:w-[calc((100%_-_72px)/4)]';
const ARRIVAL_SIZES =
  '(min-width: 90rem) 23vw, (min-width: 64rem) 31vw, (min-width: 48rem) 47vw, 76vw';

// 3. New arrivals (the owner's mockup, 2026-11-15): the newest suits in a carousel of framed cards.
// The menu's "New arrivals" link lands here (#new-arrivals).
export function NewArrivals({ suits }: { suits: SuitCard[] }) {
  if (suits.length === 0) return null;
  return (
    <section
      id="new-arrivals"
      aria-labelledby="new-arrivals-title"
      className="relative scroll-mt-24 overflow-hidden bg-bg py-16 md:py-24"
    >
      <FlowerSprig className="sway absolute top-0 right-[16%] hidden w-56 lg:block" />
      <Wave className="absolute bottom-0 left-0 h-20 w-full" />
      <div className={`${wrap} relative`}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="flex items-center gap-3 caps-tight sm:caps">
              <LotusIcon className="size-6 text-accent-text" />
              Latest Collection
              <span aria-hidden="true" className="h-px w-16 bg-fg md:w-56" />
            </p>
            <h2 id="new-arrivals-title" className="reveal text-h2 font-bold">
              New <span className="text-accent-text">Arrivals</span>
            </h2>
            <p className="text-body-lg text-muted">
              Explore our latest unstitched suits in premium fabrics and elegant prints.
            </p>
          </div>
          <Link href="/shop" className={buttonClass('secondary', 'shrink-0')}>
            All Suits
            <ArrowIcon className="nudge size-5" />
          </Link>
        </div>
        <div className="reveal" style={revealDelay(1)}>
          <Carousel
            label="Newest suits"
            itemClassName={ARRIVAL_WIDTHS}
            items={suits.map((suit) => (
              <ProductCard key={suit.id} suit={suit} sizes={ARRIVAL_SIZES} framed />
            ))}
          />
        </div>
      </div>
    </section>
  );
}

export type CollectionPanel = Collection & { cover: SuitCard['image'] };

// About 1.1 cards on phones, 2 on tablets, 3 on laptops.
const COLLECTION_WIDTHS = 'w-[88%] md:w-[calc((100%_-_24px)/2)] lg:w-[calc((100%_-_48px)/3)]';

// 4. Explore Our Collections (the owner's mockup, 2026-11-15): one card per active collection
// from admin, newest suit as its cover, in the same carousel. A new collection joins with no code
// change: it gets the default icon and its admin description.
export function ExploreCollections({ collections }: { collections: CollectionPanel[] }) {
  if (collections.length === 0) return null;
  return (
    <section
      id="collections"
      aria-labelledby="collections-title"
      className="relative scroll-mt-24 overflow-hidden bg-bg py-16 md:py-24"
    >
      <LeafBranch className="absolute top-6 -left-6 hidden w-48 md:block" />
      <FlowerSprig className="sway absolute top-0 right-0 hidden w-60 md:block" />
      <Wave className="absolute bottom-0 left-0 h-20 w-full" />
      <div className={`${wrap} relative`}>
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Eyebrow label="Collections" />
          <h2 id="collections-title" className="reveal text-h2 font-bold">
            Explore Our <span className="text-accent-text">Collections</span>
          </h2>
          <p className="text-body-lg text-muted">
            Premium unstitched suits in beautiful fabrics, made for every season.
          </p>
        </div>
        <div className="reveal" style={revealDelay(1)}>
          <Carousel
            label="Collections"
            itemClassName={COLLECTION_WIDTHS}
            items={collections.map((c) => {
              const Icon = collectionIcon(c.slug, 'card');
              return (
                <article
                  key={c.id}
                  className="collection-card flex h-full flex-col overflow-hidden rounded-lg bg-bg shadow-soft"
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-surface-soft">
                    {c.cover && (
                      <Image
                        src={shapedImageUrl(c.cover.url, 'cover')}
                        alt={c.cover.alt}
                        fill
                        sizes="(min-width: 64rem) 31vw, (min-width: 48rem) 47vw, 88vw"
                        className="product-photo object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 bg-linear-to-b from-bg to-surface-soft p-6">
                    <div className="flex items-center gap-3">
                      <Icon className="card-icon size-9 text-accent-text" />
                      <h3 className="text-h3 font-bold">{c.name}</h3>
                    </div>
                    {c.description && (
                      <p className="line-clamp-4 text-small text-muted">{c.description}</p>
                    )}
                    <Link
                      href={`/collections/${c.slug}`}
                      aria-label={`See the collection: ${c.name}`}
                      className={buttonClass(
                        'primary',
                        'mt-auto self-start px-5 whitespace-nowrap',
                      )}
                    >
                      See the collection
                      <ArrowIcon className="nudge size-5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          />
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    Icon: SuitHeartIcon,
    title: 'Choose a suit',
    text: 'Browse the collections and open any suit to see every piece, its fabric and its design code.',
    link: 'Browse Collections',
  },
  {
    Icon: WhatsAppIcon,
    title: 'Send it to us on WhatsApp',
    text: 'Tap Order on WhatsApp. The message names the suit, so we know which one you mean.',
    link: 'Order on WhatsApp',
  },
  {
    Icon: TruckIcon,
    title: 'Courier delivery',
    text: 'We confirm the price, delivery and payment with you in the chat, then send it by courier.',
    link: 'Ask on WhatsApp',
  },
];

// 5. How to order (the owner's mockup, 2026-11-15): three step cards on pale powder blue, each with
// its next move. The WhatsApp links need the shop's number, so they're left out without it.
export function HowToOrder({ whatsapp }: { whatsapp: string | null }) {
  const hrefs = [
    '#collections',
    whatsapp ? whatsappLink(whatsapp, GENERAL_WHATSAPP_TEXT) : null,
    whatsapp ? whatsappLink(whatsapp, DELIVERY_WHATSAPP_TEXT) : null,
  ];
  return (
    <section
      aria-labelledby="order-title"
      className="relative overflow-hidden bg-linear-to-b from-surface-soft via-surface-soft to-primary/25 py-16 md:py-24"
    >
      <LeafBranch className="absolute top-10 -left-8 hidden w-56 md:block" />
      <LeafBranch className="absolute bottom-4 -left-6 hidden w-48 -scale-y-100 md:block" />
      <FlowerSprig className="sway absolute top-0 right-0 hidden w-60 md:block" />
      <Wave className="absolute bottom-0 left-0 h-20 w-full fill-primary/40" />
      <div className={`${wrap} relative`}>
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <LotusOrnament />
          <h2 id="order-title" className="reveal text-h2 font-bold">
            How to <span className="text-accent-text">Order</span>
          </h2>
          <p className="text-body-lg text-muted">
            Follow these simple steps to get your favourite suit delivered at your doorstep.
          </p>
        </div>
        <ol className="grid gap-6 lg:grid-cols-3 lg:gap-12">
          {STEPS.map(({ Icon, title, text, link }, i) => {
            const href = hrefs[i];
            const external = href?.startsWith('https://');
            return (
              <li key={title} style={revealDelay(i + 1)} className="reveal relative flex">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -left-6 z-10 hidden size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg text-fg shadow-soft lg:flex"
                  >
                    <ChevronIcon className="size-5" />
                  </span>
                )}
                {/* The card. On hover or keyboard focus a deep green layer rises from the bottom
                    and the text turns white (motion.css, .step-card). */}
                <div className="step-card flex w-full flex-col gap-5 overflow-hidden rounded-lg border border-border bg-surface-soft p-6 text-fg shadow-soft md:p-8">
                  <div className="flex items-center gap-5">
                    <span className="step-icon flex size-20 shrink-0 items-center justify-center rounded-full bg-deep text-action-fg">
                      <Icon className="card-icon size-11" />
                    </span>
                    <div className="flex flex-col gap-2">
                      <p className="caps-tight">
                        Step {i + 1}
                        <span aria-hidden="true" className="mt-1 block h-0.5 w-10 bg-accent" />
                      </p>
                      <h3 className="text-body-lg font-bold">{title}</h3>
                    </div>
                  </div>
                  <p className="text-body">{text}</p>
                  {href && (
                    <a
                      href={href}
                      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
                      className="mt-auto inline-flex items-center gap-2 self-start py-2 text-small font-bold underline decoration-accent-text decoration-2 underline-offset-8"
                    >
                      {link}
                      <ArrowIcon className="nudge size-4" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
