import { getSiteSettings, listCollections } from '../../lib/catalog';
import { socialLinks } from '../../lib/nav';
import { FooterView } from './footer-view';

// Cached reads only. The view is kept apart so a test can render it with any settings.
export async function SiteFooter() {
  const [settings, collections] = await Promise.all([getSiteSettings(), listCollections()]);
  return (
    <FooterView
      shop={[
        ...collections.map((c) => ({ href: `/collections/${c.slug}`, label: c.name })),
        { href: '/shop', label: 'All suits' },
      ]}
      socials={socialLinks(settings.socials)}
      serviceArea={settings.service_area}
      whatsapp={settings.whatsapp}
    />
  );
}
