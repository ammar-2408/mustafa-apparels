import { whatsappLink } from '@mustafa/core/contact-links';
import { shapedImageUrl } from '@mustafa/core/media-url';
import { buttonClass } from '@mustafa/ui/button';
import { Logo } from '@mustafa/ui/logo';
import Image from 'next/image';
import Link from 'next/link';

import { formatPrice, piecesLabel } from '../../lib/format';
import { GENERAL_WHATSAPP_TEXT } from '../../lib/nav';
import type { Collection, Suit, SuitCard } from '../../lib/types';
import { ProductCard } from '../product/product-card';
import { ProductVideo } from '../product/product-video';
import { type Contact, ContactList } from '../site/contact-list';
import { FlowerSprig } from '../site/flourish';
import { ArrowIcon, WhatsAppIcon } from '../site/icons';

const wrap = 'mx-auto max-w-content-wide px-gutter';

type HeroPhoto = { url: string; alt: string };

// 1. Hero (docs/design.md §4, the owner's mockup of 2026-11-15): Bold headline with a deep orange
// second line, the MA submark, the two ways in, and a real suit photo in a powder blue arch.
export function Hero({ whatsapp, photo }: { whatsapp: string | null; photo: HeroPhoto | null }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-surface-soft text-fg"
    >
      <FlowerSprig className="sway absolute -top-2 right-0 w-40 md:w-56 lg:w-80" />
      <div
        className={`${wrap} grid items-center gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16 lg:py-20`}
      >
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex items-center gap-6">
            <Logo variant="submark" height={40} />
            <span aria-hidden="true" className="h-px w-24 bg-fg md:w-40" />
          </div>
          <h1 id="hero-title" className="hero-title text-h2 font-bold">
            <span className="block">Elegant Unstitched Suits,</span>{' '}
            <span className="block text-accent-text">Made for Every Occasion</span>
          </h1>
          <p className="max-w-xl text-body-lg">
            Premium unstitched 2-piece and 3-piece suits in Dhanak, Khaddar and Lajwanti. Choose
            your favourite fabric, order on WhatsApp, and get delivery anywhere in Pakistan.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/shop" className={buttonClass('primary', 'lift', 'bold')}>
              See All Suits
              <ArrowIcon className="nudge size-5" />
            </Link>
            {whatsapp && (
              <a
                href={whatsappLink(whatsapp, GENERAL_WHATSAPP_TEXT)}
                className={buttonClass('secondary', 'lift', 'bold')}
                target="_blank"
                rel="noopener"
              >
                <WhatsAppIcon className="size-5" />
                WhatsApp Us
              </a>
            )}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm md:max-w-md">
          {/* The arch: powder blue behind, the photo inset on top. */}
          <div aria-hidden="true" className="absolute inset-0 rounded-t-[999px] bg-primary" />
          <div className="relative mx-6 mt-6 aspect-4/5 overflow-hidden rounded-t-[999px] bg-surface-soft">
            {photo && (
              <Image
                src={shapedImageUrl(photo.url, 'hero')}
                alt={photo.alt}
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 64rem) 28rem, (min-width: 48rem) 26rem, 22rem"
                className="object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// 2. Statement: the plain facts about the shop, in large type (docs/seo-geo.md §7).
export function Statement() {
  return (
    <section className={`${wrap} py-section`}>
      <p className="max-w-5xl text-h2 font-light">
        Mustafa Apparels is an online shop for women&rsquo;s unstitched suits in Pakistan. Every
        suit comes as fabric for your own tailor, and every order is arranged with you on WhatsApp.
      </p>
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

type CollectionPanel = Collection & { cover: SuitCard['image'] };

// 4. Collections: three tall panels with thin dividers (hover reveal and WebGL come in Phase 8).
export function Collections({ collections }: { collections: CollectionPanel[] }) {
  if (collections.length === 0) return null;
  return (
    <section aria-labelledby="collections-title" className={`${wrap} pb-section`}>
      <h2 id="collections-title" className="mb-8 text-h2 font-light">
        Collections
      </h2>
      <ul className="grid divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {collections.map((c) => (
          <li key={c.id}>
            <Link
              href={`/collections/${c.slug}`}
              className="group flex h-full flex-col gap-6 py-8 md:px-6"
            >
              <div className="relative aspect-3/4 overflow-hidden bg-surface-soft">
                {c.cover && (
                  <Image
                    src={shapedImageUrl(c.cover.url, 'card')}
                    alt={c.cover.alt}
                    fill
                    sizes="(min-width: 48rem) 30vw, 100vw"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                )}
              </div>
              <h3 className="text-h2 font-light">{c.name}</h3>
              {c.description && (
                <p className="line-clamp-3 text-body text-muted">{c.description}</p>
              )}
              <span className="caps-tight mt-auto underline decoration-transparent underline-offset-8 group-hover:decoration-accent">
                See the collection
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 5. Featured suit: its video (or main photo) beside the details. The only video on Home.
export function FeaturedSuit({ suit }: { suit: Suit | null }) {
  if (!suit) return null;
  const video = suit.media.find((m) => m.kind === 'video');
  const photo = suit.media.find((m) => m.kind === 'image');
  return (
    <section aria-labelledby="featured-title" className={`${wrap} pb-section`}>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-24">
        <div className="flex min-w-0 justify-center bg-surface-soft">
          {video ? (
            <ProductVideo video={video} className="w-full max-w-md" />
          ) : (
            photo && (
              <div className="relative aspect-3/4 w-full max-w-md">
                <Image
                  src={shapedImageUrl(photo.url, 'whole')}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 64rem) 40vw, 100vw"
                  className="object-contain"
                />
              </div>
            )
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <p className="caps-tight text-muted">
            Featured · {suit.category.name} · {piecesLabel(suit.pieces)}
          </p>
          <h2 id="featured-title" className="text-h2 font-light">
            {suit.name}
          </h2>
          {suit.description && <p className="text-body-lg">{suit.description}</p>}
          {suit.price !== null && <p className="text-body-lg">{formatPrice(suit.price)}</p>}
          <Link
            href={`/products/${suit.slug}`}
            className={`${buttonClass('secondary')} self-start`}
          >
            See this suit
          </Link>
        </div>
      </div>
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

// 7. Contact strip: WhatsApp first, then call and email. No address or map (online only).
export function ContactStrip({ contact }: { contact: Contact }) {
  if (!contact.whatsapp && !contact.phone && !contact.email) return null;
  return (
    <section aria-labelledby="contact-title" className={`${wrap} py-section`}>
      <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-24">
        <div className="flex flex-col gap-4">
          <h2 id="contact-title" className="text-h2 font-light">
            Ask us about any suit
          </h2>
          <p className="text-body-lg">
            Send a photo or a design code on WhatsApp, or call us. We&rsquo;re online only, with no
            shop to visit.
          </p>
        </div>
        <div className="max-w-md">
          <ContactList contact={contact} />
        </div>
      </div>
    </section>
  );
}
