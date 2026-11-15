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
import { socialLinks } from '../../lib/nav';
import { buildMetadata } from '../../lib/seo';
import { onlineStore } from '../../lib/structured-data';

export const metadata = buildMetadata({
  title: 'Mustafa Apparels: unstitched suits for women in Pakistan',
  description:
    'Unstitched 2-piece and 3-piece suits in Dhanak, Khaddar and Lajwanti. Choose online, order on WhatsApp, with courier delivery across Pakistan.',
  path: '/',
});

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
  // The hero shows the featured suit's main photo, else the newest suit's.
  const featuredPhoto = featured?.media.find((m) => m.kind === 'image') ?? null;
  const heroPhoto = featuredPhoto ?? newest?.items[0]?.image ?? null;
  return (
    <>
      <JsonLd
        data={onlineStore({
          phone: settings.phone,
          email: settings.email,
          socials: socialLinks(settings.socials).map((s) => s.href),
        })}
      />
      <Hero whatsapp={settings.whatsapp} photo={heroPhoto} />
      <ShopByFabric collections={panels} />
      <Statement />
      <NewArrivals suits={newest?.items.slice(0, NEW_ARRIVALS) ?? []} />
      <FeaturedSuit suit={featured} />
      <HowToOrder />
      <ContactStrip contact={contact} />
    </>
  );
}
