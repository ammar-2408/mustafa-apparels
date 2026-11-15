import type { Metadata } from 'next';

import {
  ContactStrip,
  FeaturedSuit,
  Hero,
  HowToOrder,
  NewArrivals,
  ShopByFabric,
  Statement,
} from '../../components/home/sections';
import { JsonLd } from '../../components/json-ld';
import {
  featuredSuitSlug,
  getSiteSettings,
  getSuit,
  listCollections,
  listSuits,
} from '../../lib/catalog';
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

// Home (docs/design.md §4), static: every read is cached and tagged. Motion and 3D: Phase 8.
export default async function Home() {
  const [settings, collections, newest, slug] = await Promise.all([
    getSiteSettings(),
    listCollections(),
    listSuits({ page: 1 }),
    featuredSuitSlug(),
  ]);
  const [featured, panels] = await Promise.all([
    slug ? getSuit(slug) : null,
    Promise.all(
      collections.map(async (c) => {
        const list = await listSuits({ categorySlug: c.slug, page: 1 });
        return { ...c, cover: list?.items[0]?.image ?? null };
      }),
    ),
  ]);
  const contact = { whatsapp: settings.whatsapp, phone: settings.phone, email: settings.email };
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
      <ShopByFabric collections={panels} />
      <Statement />
      <NewArrivals suits={newest?.items.slice(0, NEW_ARRIVALS) ?? []} />
      <FeaturedSuit suit={featured} />
      <HowToOrder />
      <ContactStrip contact={contact} />
    </>
  );
}
