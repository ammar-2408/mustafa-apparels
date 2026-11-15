import { whatsappLink } from '@mustafa/core/contact-links';
import { Logo } from '@mustafa/ui/logo';
import Link from 'next/link';

import { GENERAL_WHATSAPP_TEXT, HELP_LINKS, LEGAL_LINKS, type NavLink } from '../../lib/nav';
import { LeafBranch } from './flourish';
import {
  ArrowIcon,
  ChevronIcon,
  FacebookIcon,
  InstagramIcon,
  ShirtIcon,
  TikTokIcon,
  TruckIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from './icons';

type Props = {
  shop: NavLink[];
  socials: NavLink[];
  serviceArea: string | null;
  whatsapp: string | null;
};

const SOCIAL_ICONS: Record<string, typeof InstagramIcon> = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  TikTok: TikTokIcon,
  YouTube: YouTubeIcon,
};

// Only what the shop really offers today (owner, 2026-11-15). Payment and delivery are agreed in
// WhatsApp chat; there is no returns policy or online payment yet.
const PROMISES = [
  { Icon: WhatsAppIcon, text: 'Pay in WhatsApp chat' },
  { Icon: TruckIcon, text: 'Nationwide Delivery' },
  { Icon: ShirtIcon, text: 'Unstitched, ready to tailor' },
];

function Column({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div className="min-w-0">
      <h2 className="caps">
        {title}
        <span aria-hidden="true" className="mt-2 block h-0.5 w-10 bg-accent" />
      </h2>
      <ul className="mt-5 flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="menu-row flex items-center justify-between gap-6 py-2 text-body lg:whitespace-nowrap hover:underline hover:decoration-accent hover:underline-offset-4"
            >
              {link.label}
              <ChevronIcon className="nudge size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The footer (the owner's NEWFOOTER mockup, 2026-11-15): the deeper teal (ink text only) under
// soft waves, with the
// primary black logo (docs/design.md §1.3), Shop / Help / Policies, Stay in Touch on WhatsApp
// (no email sign-up yet), the shop's true promises and the social profiles that are set.
export function FooterView({ shop, socials, serviceArea, whatsapp }: Props) {
  return (
    <footer className="relative overflow-hidden bg-teal pb-10 text-fg">
      {/* Waves: the page flows in over a lighter band at the top, and a deeper one runs along the
          bottom. Drawn with existing tokens only. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-0 left-0 h-16 w-full md:h-28"
      >
        <path className="fill-primary" d="M0 0h1440v96c-220-50-460-54-700-24S240 92 0 60z" />
        <path className="fill-bg" d="M0 0h1440v40c-200 36-420 44-640 16S320 0 0 36z" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 h-10 w-full fill-fg/10 md:h-14"
      >
        <path d="M0 80V44c240-40 520-44 760-14s460 24 680-10v60z" />
      </svg>
      <LeafBranch className="absolute top-6 right-0 hidden w-44 -scale-x-100 lg:block" />

      <div className="relative mx-auto grid max-w-content-wide gap-12 px-gutter pt-28 pb-12 md:pt-40 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1.2fr)] lg:gap-0">
        <div className="lg:pr-10">
          <Link href="/" className="inline-block">
            <Logo variant="primary" height={120} />
          </Link>
          <p className="mt-6 max-w-xs text-body">
            Unstitched 2-piece and 3-piece suits, ordered on WhatsApp. Courier delivery across{' '}
            {serviceArea ?? 'Pakistan'}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:contents">
          <div className="lg:border-l lg:border-fg/20 lg:px-8">
            <Column title="Shop" links={shop} />
          </div>
          <div className="lg:border-l lg:border-fg/20 lg:px-8">
            <Column title="Help" links={HELP_LINKS} />
          </div>
          <div className="lg:border-l lg:border-fg/20 lg:px-8">
            <Column title="Policies" links={LEGAL_LINKS} />
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:border-l lg:border-fg/20 lg:pl-10">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-bg">
              <WhatsAppIcon className="size-8" />
            </span>
            <div>
              <h2 className="text-h3 font-bold">Stay in Touch</h2>
              <p className="mt-1 text-small">
                Get updates on new arrivals and collections on WhatsApp.
              </p>
            </div>
          </div>
          {whatsapp && (
            <a
              href={whatsappLink(whatsapp, GENERAL_WHATSAPP_TEXT)}
              target="_blank"
              rel="noopener"
              className="menu-row mt-2 inline-flex items-center gap-4 self-start border-t border-fg/20 pt-5 text-body-lg font-bold"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-bg">
                <WhatsAppIcon className="size-8" />
              </span>
              Order on WhatsApp
              <ArrowIcon className="nudge size-5" />
            </a>
          )}
        </div>
      </div>

      <div className="relative mx-auto max-w-content-wide px-gutter">
        <div className="flex flex-col gap-6 border-t border-fg/20 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-small">© Mustafa Apparels. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 lg:gap-x-0 lg:divide-x lg:divide-fg/20">
            {PROMISES.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-small lg:px-8 lg:last:pr-0">
                <Icon className="size-6" />
                {text}
              </li>
            ))}
          </ul>
          {socials.length > 0 && (
            <ul className="flex gap-2">
              {socials.map((social) => {
                const Icon = SOCIAL_ICONS[social.label] ?? ArrowIcon;
                return (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener"
                      aria-label={social.label}
                      className="header-control inline-flex size-11 items-center justify-center rounded-full"
                    >
                      <Icon className="size-6" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
