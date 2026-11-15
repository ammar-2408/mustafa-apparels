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
              className="menu-row flex items-center justify-between gap-6 py-2 text-body whitespace-nowrap hover:underline hover:decoration-accent hover:underline-offset-4"
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

// The footer (the owner's mockup, 2026-11-15): pale powder blue under a white wave, with the
// primary black logo (docs/design.md §1.3), Shop / Help / Policies, Stay in Touch on WhatsApp
// (no email sign-up yet), the shop's true promises and the social profiles that are set.
export function FooterView({ shop, socials, serviceArea, whatsapp }: Props) {
  return (
    <footer className="relative overflow-hidden bg-surface-soft text-fg">
      {/* A white wave along the top edge, flowing out of the page above. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-0 left-0 h-12 w-full fill-bg md:h-20"
      >
        <path d="M0 0h1440v28c-200 40-420 52-640 20S340 4 0 44z" />
      </svg>
      <LeafBranch className="absolute top-4 right-0 hidden w-44 -scale-x-100 lg:block" />

      <div className="relative mx-auto grid max-w-content-wide gap-12 px-gutter pt-24 pb-12 md:pt-32 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1.2fr)] lg:gap-0">
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
          <div className="lg:border-l lg:border-border lg:px-8">
            <Column title="Shop" links={shop} />
          </div>
          <div className="lg:border-l lg:border-border lg:px-8">
            <Column title="Help" links={HELP_LINKS} />
          </div>
          <div className="lg:border-l lg:border-border lg:px-8">
            <Column title="Policies" links={LEGAL_LINKS} />
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:border-l lg:border-border lg:pl-10">
          <div className="flex items-start gap-4">
            <WhatsAppIcon className="size-9" />
            <div>
              <h2 className="text-h3 font-bold">Stay in Touch</h2>
              <p className="mt-1 text-small text-muted">
                Get updates on new arrivals and collections on WhatsApp.
              </p>
            </div>
          </div>
          {whatsapp && (
            <a
              href={whatsappLink(whatsapp, GENERAL_WHATSAPP_TEXT)}
              target="_blank"
              rel="noopener"
              className="menu-row mt-2 inline-flex items-center gap-4 self-start border-t border-border pt-5 text-body-lg font-bold"
            >
              <WhatsAppIcon className="size-8" />
              <span aria-hidden="true" className="h-8 w-px bg-border-strong" />
              Order on WhatsApp
              <ArrowIcon className="nudge size-5 text-accent-text" />
            </a>
          )}
        </div>
      </div>

      <div className="relative mx-auto max-w-content-wide px-gutter">
        <div className="flex flex-col gap-6 border-t border-border py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-small text-muted">© Mustafa Apparels. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {PROMISES.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-small">
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
