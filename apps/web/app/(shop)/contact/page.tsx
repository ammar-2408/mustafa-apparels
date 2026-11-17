import { mailtoLink, telLink, whatsappLink } from '@mustafa/core/contact-links';

import { JsonLd } from '../../../components/json-ld';
import { displayNumber } from '../../../components/site/contact-list';
import { ArrowIcon, MailIcon, PhoneIcon, WhatsAppIcon } from '../../../components/site/icons';
import { StaticPage } from '../../../components/static-page';
import { getSiteSettings } from '../../../lib/catalog';
import { GENERAL_WHATSAPP_TEXT, socialLinks } from '../../../lib/nav';
import { buildMetadata } from '../../../lib/seo';
import { SITE_ART } from '../../../lib/site-art';
import { onlineStore } from '../../../lib/structured-data';

export const metadata = buildMetadata({
  title: 'Contact us',
  description:
    'Contact Mustafa Apparels on WhatsApp, by phone or by email about any unstitched suit. We are online only and deliver by courier across Pakistan.',
  path: '/contact',
});

// The owner's newcontact.png (2026-11-17), in the site's colours: WhatsApp first as a large deep
// green button, then Call, then the email. Each is left out when the shop hasn't set it.
// No map and no address: the shop is online only (ADR-013).
export default async function ContactPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage
      title="Contact"
      accent="Us"
      path="/contact"
      lead="The quickest way to reach us is WhatsApp. Send a design code or a photo of the suit you like."
      art={SITE_ART.pageContact}
    >
      <JsonLd
        data={onlineStore({
          phone: settings.phone,
          email: settings.email,
          socials: socialLinks(settings.socials).map((s) => s.href),
        })}
      />
      <div className="flex max-w-xl flex-col gap-4">
        {settings.whatsapp && (
          <a
            href={whatsappLink(settings.whatsapp, GENERAL_WHATSAPP_TEXT)}
            target="_blank"
            rel="noopener"
            className="lift flex min-h-16 items-center gap-4 rounded-lg bg-deep px-5 text-action-fg shadow-soft sm:gap-5 sm:px-7"
          >
            <WhatsAppIcon className="size-7" />
            <span aria-hidden="true" className="h-8 w-px bg-action-fg/40" />
            <span className="flex-1 caps-tight sm:caps">WhatsApp us</span>
            <ArrowIcon className="nudge size-6" />
          </a>
        )}
        {settings.phone && (
          <a
            href={telLink(settings.phone)}
            className="lift flex min-h-16 items-center gap-4 rounded-lg border border-deep bg-bg/70 px-5 text-deep sm:gap-5 sm:px-7"
          >
            <PhoneIcon className="size-7" />
            <span aria-hidden="true" className="h-8 w-px bg-deep/30" />
            <span className="caps-tight sm:caps">Call {displayNumber(settings.phone)}</span>
          </a>
        )}
        {settings.email && (
          <a
            href={mailtoLink(settings.email)}
            className="inline-flex min-h-11 items-center gap-4 self-start text-body-lg"
          >
            <MailIcon className="size-7" />
            <span className="link break-all">{settings.email}</span>
          </a>
        )}
      </div>
      {settings.reply_note && <p className="text-body-lg">{settings.reply_note}</p>}
    </StaticPage>
  );
}
