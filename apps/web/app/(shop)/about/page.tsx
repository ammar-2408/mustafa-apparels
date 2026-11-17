import { Logo } from '@mustafa/ui/logo';

import { BagIcon, TruckIcon } from '../../../components/site/icons';
import { InfoCard, StaticPage } from '../../../components/static-page';
import { buildMetadata } from '../../../lib/seo';
import { SITE_ART } from '../../../lib/site-art';

export const metadata = buildMetadata({
  title: 'About Mustafa Apparels',
  description:
    'Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan, run by Mustafa Ahmed. Dhanak, Khaddar and Lajwanti suits, ordered on WhatsApp.',
  path: '/about',
});

// The owner's newabout.png (2026-11-17), in the site's colours. "What We Sell" is the owner's
// own text (2026-11-17).
export default function AboutPage() {
  return (
    <StaticPage
      title="About"
      accent="Us"
      path="/about"
      lead="Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan. You choose a suit here, order it on WhatsApp, and it comes to you by courier."
      art={SITE_ART.pageAbout}
    >
      <Logo variant="primary" height={140} className="self-start" />
      <div className="grid gap-6 md:grid-cols-2">
        <InfoCard icon={BagIcon} title="What We Sell">
          <p>
            Discover our collection of unstitched suits, designer wear, and fancy ensembles,
            featuring carefully selected fabrics, elegant designs, intricate detailing, and
            beautiful colours. From everyday essentials to festive celebrations and special
            occasions, find the perfect outfit that reflects your personal style. Explore our latest
            collections and shop your favourites today.
          </p>
        </InfoCard>
        <InfoCard icon={TruckIcon} title="How We Work">
          <p>
            We are online only, with no shop to visit. Every order is arranged with you on WhatsApp:
            we confirm the suit, the price, delivery and payment in the chat, then send it by
            courier anywhere in Pakistan.
          </p>
        </InfoCard>
      </div>
    </StaticPage>
  );
}
