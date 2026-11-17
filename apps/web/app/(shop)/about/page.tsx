import { Logo } from '@mustafa/ui/logo';

import { Part, StaticPage } from '../../../components/static-page';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'About Mustafa Apparels',
  description:
    'Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan, run by Mustafa Ahmed. Dhanak, Khaddar and Lajwanti suits, ordered on WhatsApp.',
  path: '/about',
});

// TODO-OWNER: the owner approves this text before launch (docs/launch-checklist.md §8).
export default function AboutPage() {
  return (
    <StaticPage
      title="About us"
      path="/about"
      lead="Mustafa Apparels is an online shop for women’s unstitched suits in Pakistan. You choose a suit here, order it on WhatsApp, and it comes to you by courier."
    >
      <Logo variant="primary" height={140} />
      <Part title="What we sell">
        <p>
          Discover our collection of unstitched suits, designer wear, and fancy ensembles, featuring
          carefully selected fabrics, elegant designs, intricate detailing, and beautiful colours.
          From everyday essentials to festive celebrations and special occasions, find the perfect
          outfit that reflects your personal style. Explore our latest collections and shop your
          favourites today.
        </p>
      </Part>
      <Part title="How we work">
        <p>
          We are online only, with no shop to visit. Every order is arranged with you on WhatsApp:
          we confirm the suit, the price, delivery and payment in the chat, then send it by courier
          anywhere in Pakistan.
        </p>
      </Part>
    </StaticPage>
  );
}
