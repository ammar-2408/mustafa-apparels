import type { Metadata } from 'next';

import {
  About,
  ExploreCollections,
  Hero,
  HowToOrder,
  NewArrivals,
} from '../../components/home/sections';
import { JsonLd } from '../../components/json-ld';
import { getSiteSettings, listCollections, listSuits } from '../../lib/catalog';
import { collectionList } from '../../lib/format';
import { socialLinks } from '../../lib/nav';
import { buildMetadata } from '../../lib/seo';
import { SITE_ART } from '../../lib/site-art';
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
  // Each collection's cover is its newest suit's photo (cached and tagged like every read).
  const panels = await Promise.all(
    collections.map(async (c) => {
      const list = await listSuits({ categorySlug: c.slug, page: 1 });
      return { ...c, cover: list?.items[0]?.image ?? null };
    }),
  );
  return (
    <>
      <JsonLd
        data={onlineStore({
          phone: settings.phone,
          email: settings.email,
          socials: socialLinks(settings.socials).map((s) => s.href),
        })}
      />
      <Hero whatsapp={settings.whatsapp} />
      <About art={SITE_ART.aboutBoutique} leaves={SITE_ART.aboutLeaves} />
      <NewArrivals suits={newest?.items.slice(0, NEW_ARRIVALS) ?? []} />
      <ExploreCollections collections={panels} />
      <HowToOrder whatsapp={settings.whatsapp} />
    </>
  );
}
