import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  CardIcon,
  HangerIcon,
  ReturnBoxIcon,
  TruckIcon,
  WhatsAppIcon,
} from '../../../components/site/icons';
import { StaticPage } from '../../../components/static-page';
import { getSiteSettings } from '../../../lib/catalog';
import { buildMetadata } from '../../../lib/seo';
import { SITE_ART } from '../../../lib/site-art';

export const metadata = buildMetadata({
  title: 'How to order',
  description:
    'How to order an unstitched suit from Mustafa Apparels: choose it online, send it to us on WhatsApp, and get it by courier anywhere in Pakistan.',
  path: '/how-to-order',
});

type Icon = (props: { className?: string }) => ReactNode;

// The owner's neworder.png (2026-11-17), in the site's colours: numbered deep green circles
// joined by a dashed line, each beside a card with an icon tile, a serif title and the text.
// Delivery, payment and returns come from the owner's settings in admin. Until they are set,
// the page says only what is already true: both are confirmed with you in the chat.
// TODO-OWNER: payment methods, courier charges and timing, and the returns policy (step 10.2).
export default async function HowToOrderPage() {
  const settings = await getSiteSettings();
  const steps: { icon: Icon; title: string; text: ReactNode }[] = [
    {
      icon: HangerIcon,
      title: 'Choose a Suit',
      text: (
        <>
          Browse{' '}
          <Link href="/shop" className="link">
            all suits
          </Link>{' '}
          or a collection. Each suit&rsquo;s page lists every piece, its fabric and its design code.
        </>
      ),
    },
    {
      icon: WhatsAppIcon,
      title: 'Send it to us on WhatsApp',
      text: 'Tap Order on WhatsApp on the suit’s page. The message names the suit and its design code, so we know exactly which one you mean. You can also call us or email us.',
    },
    {
      icon: TruckIcon,
      title: 'Delivery',
      text:
        settings.delivery_info ??
        `We send every order by courier, anywhere in ${settings.service_area ?? 'Pakistan'}. We confirm the delivery charge and timing with you in the chat.`,
    },
    {
      icon: CardIcon,
      title: 'Payment',
      text:
        settings.payment_info ??
        'We confirm how to pay with you in the chat before your suit is sent. There is no online payment on this site.',
    },
    {
      icon: ReturnBoxIcon,
      title: 'Returns',
      text: settings.return_policy ?? 'Please ask us on WhatsApp about returns before you order.',
    },
  ];
  return (
    <StaticPage
      title="How to"
      accent="Order"
      path="/how-to-order"
      lead="Choose a suit here, send it to us on WhatsApp, and we send it to you by courier."
      art={SITE_ART.pageOrder}
    >
      <ol className="flex flex-col gap-4">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="relative flex items-stretch gap-3 sm:gap-5">
            {/* The number, and the dashed line down to the next one. */}
            <div className="relative flex w-10 shrink-0 justify-center pt-5">
              <span className="relative z-10 flex size-10 items-center justify-center rounded-full bg-deep font-bold text-action-fg">
                {i + 1}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-14 -bottom-6 left-1/2 border-l-2 border-dashed border-deep/40"
                />
              )}
            </div>
            <section className="flex min-w-0 flex-1 items-start gap-4 rounded-lg border border-border bg-bg/80 p-4 shadow-soft sm:gap-5 sm:p-5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-accent/10 text-deep">
                <Icon className="size-7" />
              </span>
              <div className="min-w-0">
                <h2 className="font-serif text-h3 text-deep">{title}</h2>
                <p className="mt-1 text-body">{text}</p>
              </div>
            </section>
          </li>
        ))}
      </ol>
    </StaticPage>
  );
}
