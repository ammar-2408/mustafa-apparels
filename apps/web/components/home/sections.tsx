import { whatsappLink } from '@mustafa/core/contact-links';
import { buttonClass } from '@mustafa/ui/button';
import { Logo } from '@mustafa/ui/logo';
import Image from 'next/image';
import Link from 'next/link';

import { collectionList } from '../../lib/format';
import { GENERAL_WHATSAPP_TEXT } from '../../lib/nav';
import type { SiteArt } from '../../lib/site-art';
import type { SuitCard } from '../../lib/types';
import { ProductCard } from '../product/product-card';
import { Eyebrow, Swash, Wave } from '../site/flourish';
import { ArrowIcon, LayersIcon, ShirtIcon, WhatsAppIcon } from '../site/icons';

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
  art: SiteArt | null;
}) {
  const names = collectionList(collections);
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-surface-soft text-fg"
    >
      <div
        className={`${wrap} grid items-center lg:min-h-[34rem] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}
      >
        <div className="relative z-10 flex min-w-0 flex-col gap-8 py-12 md:py-16 lg:py-20">
          <div className="flex items-center gap-6">
            <Logo variant="submark" height={40} />
            <span aria-hidden="true" className="h-px w-24 bg-fg md:w-40" />
          </div>
          <h1 id="hero-title" className="hero-title text-h2 font-bold">
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
      {art && (
        <div className="relative aspect-[563/470] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[44%]">
          <Image
            src={art.src}
            alt={art.alt}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 64rem) 44vw, 100vw"
            className="object-cover object-left"
          />
          {/* Fades the picture into the band, so the text side stays calm. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 hidden w-1/4 bg-linear-to-r from-surface-soft lg:block"
          />
        </div>
      )}
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
export function About({ art }: { art: SiteArt | null }) {
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
        {art && (
          <div className="relative mx-auto aspect-[914/887] w-full max-w-xl [mask-image:linear-gradient(to_right,transparent,black_15%)]">
            <Image
              src={art.src}
              alt={art.alt}
              fill
              sizes="(min-width: 64rem) 40vw, 100vw"
              className="object-contain"
            />
          </div>
        )}
      </div>
    </section>
  );
}

// 3. New arrivals: a swipe row of the newest suits (pinned scroll comes with motion, Phase 8).
export function NewArrivals({ suits }: { suits: SuitCard[] }) {
  if (suits.length === 0) return null;
  return (
    <section
      id="new-arrivals"
      aria-labelledby="new-arrivals-title"
      className="scroll-mt-24 pb-section"
    >
      <div className={`${wrap} mb-8 flex items-end justify-between gap-6`}>
        <h2 id="new-arrivals-title" className="text-h2 font-light">
          New arrivals
        </h2>
        <Link href="/shop" className="link caps-tight shrink-0 py-3">
          All suits
        </Link>
      </div>
      <ul className="flex snap-x snap-mandatory gap-grid overflow-x-auto px-gutter pb-4 [scrollbar-width:thin] 2xl:mx-auto 2xl:max-w-content-wide">
        {suits.map((suit) => (
          <li
            key={suit.id}
            className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-[30%] xl:w-[22%]"
          >
            <ProductCard
              suit={suit}
              sizes="(min-width: 80rem) 22vw, (min-width: 48rem) 30vw, (min-width: 30rem) 42vw, 70vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEPS = [
  {
    title: 'Choose a suit',
    text: 'Browse the collections and open any suit to see every piece, its fabric and its design code.',
  },
  {
    title: 'Send it to us on WhatsApp',
    text: 'Tap Order on WhatsApp. The message names the suit, so we know which one you mean.',
  },
  {
    title: 'Courier delivery',
    text: 'We confirm the price, delivery and payment with you in the chat, then send it by courier.',
  },
];

// 6. How to order: the three steps, in order, on powder blue.
export function HowToOrder() {
  return (
    <section aria-labelledby="order-title" className="bg-primary py-section text-primary-fg">
      <div className={wrap}>
        <h2 id="order-title" className="mb-12 text-h2 font-light">
          How to order
        </h2>
        <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-4 border-t border-fg pt-6">
              <span className="caps-tight">Step {i + 1}</span>
              <h3 className="text-h3 font-light">{step.title}</h3>
              <p className="text-body">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/how-to-order" className="link mt-12 inline-block py-2">
          Delivery, payment and returns
        </Link>
      </div>
    </section>
  );
}
