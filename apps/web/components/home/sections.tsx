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
import { ProductCard } from '../product/product-card';
import { Eyebrow, FlowerSprig, LeafBranch, LotusOrnament, Swash, Wave } from '../site/flourish';
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

// 1. Hero (docs/design.md §4, the owner's mockup of 2026-11-15): Bold headline with a deep orange
// second line, the MA submark, the two ways in, and the mockup's fabric picture filling the right
// half. The collection names come from admin, so new collections never need a code change.
export function Hero({
  whatsapp,
  collections,
  art,
}: {
  whatsapp: string | null;
  collections: string[];
  art: SiteArt;
}) {
  const names = collectionList(collections);
  return (
    // At least one screen tall (minus the navbar's fixed height), so nothing below shows on load.
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-linear-to-br from-surface-soft via-surface-soft to-primary/40 text-fg md:min-h-[calc(100svh-5rem)] lg:flex-row lg:items-center lg:min-h-[calc(100svh-6rem)]"
    >
      <div className={`${wrap} w-full`}>
        <div className="relative z-10 flex min-w-0 flex-col gap-8 py-12 md:py-16 lg:w-[55%] lg:py-20 lg:pr-8">
          <Logo variant="submark" height={40} className="self-start" />
          <h1 id="hero-title" className="hero-title text-hero font-bold">
            <span className="block">Elegant Unstitched Suits,</span>{' '}
            <span className="block text-accent-text">Made for Every Occasion</span>
          </h1>
          <p className="max-w-xl text-body-lg">
            Premium unstitched 2-piece and 3-piece suits{names ? ` in ${names}` : ''}. Choose your
            favourite fabric, order on WhatsApp, and get delivery anywhere in Pakistan.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/shop" className={buttonClass('primary', undefined, 'bold')}>
              See All Suits
              <ArrowIcon className="nudge size-5" />
            </Link>
            {whatsapp && (
              <a
                href={whatsappLink(whatsapp, GENERAL_WHATSAPP_TEXT)}
                className={buttonClass('secondary', undefined, 'bold')}
                target="_blank"
                rel="noopener"
              >
                <WhatsAppIcon className="size-5" />
                WhatsApp Us
              </a>
            )}
          </div>
        </div>
      </div>
      {/* The picture fills the right side at full height; on phones it fills the rest of the screen. */}
      <div className="relative min-h-72 w-full flex-1 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[45%]">
        <Image
          src={art.src}
          alt={art.alt}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 64rem) 45vw, 100vw"
          className="object-cover"
        />
        {/* Fades the picture into the band, so the text side stays calm. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-1/4 bg-linear-to-r from-surface-soft lg:block"
        />
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
    <section aria-labelledby="about-title" className="relative overflow-hidden bg-bg">
      <Wave className="absolute bottom-0 left-0 h-24 w-full" />
      <div
        className={`${wrap} relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <Eyebrow label="About Mustafa Apparels" align="start" />
          <h2 id="about-title" className="reveal text-h2 font-bold text-wrap">
            <span className="block">Mustafa Apparels is an</span>{' '}
            <span className="block text-accent-text">online shop for women’s</span>{' '}
            <span className="block">unstitched suits in Pakistan.</span>
          </h2>
          <Swash className="h-3 w-44" />
          <p className="max-w-xl text-body-lg">
            Every suit comes as fabric for your own tailor, and every order is arranged with you on
            WhatsApp.
          </p>
          <ul className="mt-2 grid grid-cols-3 divide-x divide-border">
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
        <div className="relative mx-auto aspect-[914/887] w-full max-w-xl [mask-image:linear-gradient(to_right,transparent,black_15%)]">
          <Image
            src={art.src}
            alt={art.alt}
            fill
            sizes="(min-width: 64rem) 40vw, 100vw"
            className="object-contain"
          />
        </div>
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
        <Carousel
          label="Newest suits"
          itemClassName={ARRIVAL_WIDTHS}
          items={suits.map((suit) => (
            <ProductCard key={suit.id} suit={suit} sizes={ARRIVAL_SIZES} framed />
          ))}
        />
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
                    className={buttonClass('primary', 'mt-auto self-start px-5 whitespace-nowrap')}
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
      className="relative overflow-hidden bg-surface-soft py-16 md:py-24"
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
              <li
                key={title}
                className="step-card relative flex flex-col gap-5 rounded-lg bg-bg p-6 shadow-soft md:p-8"
              >
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -left-6 hidden size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface-soft text-fg shadow-soft lg:flex"
                  >
                    <ChevronIcon className="size-5" />
                  </span>
                )}
                <div className="flex items-center gap-5">
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-soft">
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
                    className="mt-auto inline-flex items-center gap-2 self-start py-2 text-small underline decoration-accent-text decoration-2 underline-offset-8"
                  >
                    {link}
                    <ArrowIcon className="nudge size-4" />
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
