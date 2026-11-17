import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  CardIcon,
  CartIcon,
  ChevronIcon,
  LayersIcon,
  ShopIcon,
  TruckIcon,
} from '../../../components/site/icons';
import { StaticPage } from '../../../components/static-page';
import { getSiteSettings } from '../../../lib/catalog';
import { buildMetadata } from '../../../lib/seo';
import { SITE_ART } from '../../../lib/site-art';

export const metadata = buildMetadata({
  title: 'Questions and answers',
  description:
    'Answers about Mustafa Apparels unstitched suits: what unstitched means, ordering on WhatsApp, courier delivery across Pakistan, payment and fabrics.',
  path: '/faq',
});

type Icon = (props: { className?: string }) => ReactNode;

// One question: a native <details>, so it opens without JavaScript and every answer is in the
// server HTML for search and AI answers (docs/seo-geo.md §7). The open row's tile turns deep green.
function Question({
  icon: Icon,
  question,
  open = false,
  children,
}: {
  icon: Icon;
  question: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      className="group overflow-hidden rounded-lg border border-border bg-bg/80 shadow-soft"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-4 py-3 group-open:bg-accent/10 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent/10 text-deep group-open:bg-deep group-open:text-action-fg">
          <Icon className="size-6" />
        </span>
        <h2 className="min-w-0 flex-1 font-serif text-h3 text-deep">{question}</h2>
        <ChevronIcon className="size-5 shrink-0 rotate-90 transition-transform group-open:-rotate-90 motion-reduce:transition-none" />
      </summary>
      <div className="px-4 pt-3 pb-5 text-body sm:pr-6 sm:pl-[5.25rem]">{children}</div>
    </details>
  );
}

// The owner's newfaq.png (2026-11-17), in the site's colours. Each heading is a question,
// answered in its first sentence (docs/seo-geo.md §7).
// TODO-OWNER: the payment and returns answers follow the owner's settings (step 10.2).
export default async function FaqPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage
      title="Questions &"
      accent="Answers"
      path="/faq"
      lead="Find quick answers to the most common questions about our unstitched suits, orders, delivery, and payments."
      art={SITE_ART.pageFaq}
    >
      <div className="flex flex-col gap-4">
        <Question icon={LayersIcon} question="What does unstitched mean?" open>
          <p>
            An unstitched suit is the fabric for each piece, ready for your own tailor. A 3-piece
            suit has a shirt, a dupatta and trousers; a 2-piece suit has a shirt and trousers.
          </p>
        </Question>
        <Question icon={CartIcon} question="How do I order?">
          <p>
            Tap Order on WhatsApp on the suit&rsquo;s page and send the message. We confirm the
            details with you in the chat.{' '}
            <Link href="/how-to-order" className="link">
              How to order
            </Link>{' '}
            has the steps.
          </p>
        </Question>
        <Question icon={TruckIcon} question="Where do you deliver?">
          <p>We deliver by courier across {settings.service_area ?? 'Pakistan'}.</p>
        </Question>
        <Question icon={CardIcon} question="How do I pay?">
          <p>
            {settings.payment_info ??
              'We confirm how to pay with you on WhatsApp before your suit is sent. There is no online payment on this site.'}
          </p>
        </Question>
        <Question icon={ShopIcon} question="Do you have a shop I can visit?">
          <p>
            No. We are online only, so every order is arranged on WhatsApp, by phone or by email.
          </p>
        </Question>
      </div>
    </StaticPage>
  );
}
