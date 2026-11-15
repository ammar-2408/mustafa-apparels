import type { Metadata } from 'next';

import { About, Hero, HowToOrder, NewArrivals } from '../../components/home/sections';
import { JsonLd } from '../../components/json-ld';
import { getSiteSettings, listCollections, listSuits } from '../../lib/catalog';
import { collectionList } from '../../lib/format';
import { socialLinks } from '../../lib/nav';
import { buildMetadata } from '../../lib/seo';
import { SITE_ART, siteArt } from '../../lib/site-art';
import { onlineStore } from '../../lib/structured-data';

// The description names the collections from admin (cached read), so new ones join it.
export async function generateMetadata(): Promise<Metadata> {
  const names = collectionList((await listCollections()).map((c) => c.name));
  return buildMetadata({
    title: 'Mustafa Apparels: unstitched suits for women in Pakistan',
    description: `Unstitched 2-piece and 3-piece suits${names ? ` in ${names}` : ''}. Choose online, order on WhatsApp, with courier delivery across Pakistan.`,
    path: '/',
  });
}

const NEW_ARRIVALS = 8;

// Home (docs/design.md §4), static: every read is cached and tagged. Order: hero, about, new
// arrivals, collections, how to order (the owner's mockups, 2026-11-15).
export default async function Home() {
  const [settings, collections, newest] = await Promise.all([
    getSiteSettings(),
    listCollections(),
    listSuits({ page: 1 }),
  ]);
  return (
    <>
      <JsonLd
        data={onlineStore({
          phone: settings.phone,
          email: settings.email,
          socials: socialLinks(settings.socials).map((s) => s.href),
        })}
      />
      <Hero
        whatsapp={settings.whatsapp}
        collections={collections.map((c) => c.name)}
        art={siteArt(SITE_ART.heroFabric)}
      />
      <About art={siteArt(SITE_ART.aboutFabric)} />
      <NewArrivals suits={newest?.items.slice(0, NEW_ARRIVALS) ?? []} />
      <HowToOrder />
    </>
  );
}
