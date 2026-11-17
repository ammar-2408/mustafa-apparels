import { JsonLd } from '../../../components/json-ld';
import { ContactList } from '../../../components/site/contact-list';
import { StaticPage } from '../../../components/static-page';
import { getSiteSettings } from '../../../lib/catalog';
import { socialLinks } from '../../../lib/nav';
import { buildMetadata } from '../../../lib/seo';
import { onlineStore } from '../../../lib/structured-data';

export const metadata = buildMetadata({
  title: 'Contact us',
  description:
    'Contact Mustafa Apparels on WhatsApp, by phone or by email about any unstitched suit. We are online only and deliver by courier across Pakistan.',
  path: '/contact',
});

// No map and no address: the shop is online only (ADR-013).
export default async function ContactPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage
      title="Contact us"
      path="/contact"
      lead="The quickest way to reach us is WhatsApp. Send a design code or a photo of the suit you like."
    >
      <JsonLd
        data={onlineStore({
          phone: settings.phone,
          email: settings.email,
          socials: socialLinks(settings.socials).map((s) => s.href),
        })}
      />
      <div className="max-w-md">
        <ContactList
          contact={{ whatsapp: settings.whatsapp, phone: settings.phone, email: settings.email }}
        />
      </div>
      {settings.reply_note && <p className="text-body-lg">{settings.reply_note}</p>}
    </StaticPage>
  );
}
