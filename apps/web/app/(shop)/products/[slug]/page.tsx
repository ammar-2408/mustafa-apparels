import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { JsonLd } from '../../../../components/json-ld';
import { InquiryForm } from '../../../../components/product/inquiry-form';
import { ProductGrid } from '../../../../components/product/product-grid';
import { StickyWhatsApp, SuitContact } from '../../../../components/product/suit-contact';
import { SuitDetails } from '../../../../components/product/suit-details';
import { SuitGallery } from '../../../../components/product/suit-gallery';
import { getSiteSettings, getSuit, listSuits, suitRedirect } from '../../../../lib/catalog';
import { buildMetadata } from '../../../../lib/seo';
import { breadcrumbList } from '../../../../lib/structured-data';
import { productJsonLd } from '../../../../lib/structured-product';
import { submitInquiry } from './actions';

type Props = { params: Promise<{ slug: string }> };

// Every published suit is prerendered; one published later renders on its first request.
export async function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  for (let page = 1; ; page++) {
    const list = await listSuits({ page });
    if (!list) break;
    slugs.push(...list.items.map((s) => ({ slug: s.slug })));
    if (page >= list.pageCount) break;
  }
  return slugs;
}

// The suit, or the right answer instead: an old slug moves permanently (308), anything else
// (unknown, draft, archived, deleted) is a real 404 (docs/design.md §8.6).
async function load(params: Props['params']) {
  const { slug } = await params;
  // One address per suit: capitals move permanently to the lowercase one.
  if (slug !== slug.toLowerCase()) permanentRedirect(`/products/${slug.toLowerCase()}`);
  const suit = await getSuit(slug);
  if (suit) return suit;
  const current = await suitRedirect(slug);
  if (current) permanentRedirect(`/products/${current}`);
  notFound();
}

const suitDescription = (suit: Awaited<ReturnType<typeof load>>) =>
  suit.seoDescription ??
  suit.description ??
  `${suit.name}: an unstitched ${suit.fabric} suit from Mustafa Apparels. Order on WhatsApp with courier delivery across Pakistan.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Never notFound() or redirect here: the page does that. Thrown from both, a redirect can reach
  // the browser with its Location header twice (seen in CI), which sends it to a broken address.
  const suit = await getSuit((await params).slug);
  if (!suit) return {};
  // The default share image until the generated 1200×630 one (step 7.4).
  return buildMetadata({
    title: suit.seoTitle ?? suit.name,
    description: suitDescription(suit),
    path: `/products/${suit.slug}`,
  });
}

export default async function SuitPage({ params }: Props) {
  const [suit, settings] = await Promise.all([load(params), getSiteSettings()]);
  const contact = {
    whatsapp: settings.whatsapp,
    phone: settings.phone,
    email: settings.email,
    delivery: settings.delivery_info,
    payment: settings.payment_info,
    replyNote: settings.reply_note,
  };
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: suit.category.name, path: `/collections/${suit.category.slug}` },
    { name: suit.name, path: `/products/${suit.slug}` },
  ];
  return (
    <article className="mx-auto max-w-content-wide px-gutter pt-6 pb-section md:pt-12">
      <JsonLd data={productJsonLd(suit, suitDescription(suit))} />
      <JsonLd data={breadcrumbList(crumbs)} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <SuitGallery name={suit.name} media={suit.media} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SuitDetails suit={suit} actions={<SuitContact suit={suit} contact={contact} />} />
        </div>
      </div>

      <section
        aria-labelledby="ask-title"
        className="mt-section grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
      >
        <div className="flex flex-col gap-4">
          <h2 id="ask-title" className="text-h3 font-light">
            Ask about this suit
          </h2>
          <p className="text-body text-muted">
            Prefer to write? Send your question here and we&rsquo;ll reply. For the quickest answer,
            use WhatsApp.
          </p>
        </div>
        <div className="max-w-xl">
          <InquiryForm productId={suit.id} suitName={suit.name} submit={submitInquiry} />
        </div>
      </section>

      {suit.alsoInDesign.length > 0 && (
        <section className="mt-section">
          <h2 className="mb-8 text-h3 font-light">Also in this design</h2>
          <ProductGrid suits={suit.alsoInDesign} eager={0} />
        </section>
      )}
      {suit.related.length > 0 && (
        <section className="mt-section">
          <h2 className="mb-8 text-h3 font-light">More from {suit.category.name}</h2>
          <ProductGrid suits={suit.related} eager={0} />
        </section>
      )}
      <StickyWhatsApp suit={suit} whatsapp={contact.whatsapp} />
    </article>
  );
}
