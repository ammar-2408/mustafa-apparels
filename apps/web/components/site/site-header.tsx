import { getSiteSettings, listCollections } from '../../lib/catalog';
import { menuLinks } from '../../lib/nav';
import { HeaderBar } from './header-bar';

// Cached reads only (settings, collections), so every page that shows it stays cached.
export async function SiteHeader() {
  const [settings, collections] = await Promise.all([getSiteSettings(), listCollections()]);
  return (
    <HeaderBar
      links={menuLinks(collections)}
      contact={{ whatsapp: settings.whatsapp, phone: settings.phone, email: settings.email }}
    />
  );
}
