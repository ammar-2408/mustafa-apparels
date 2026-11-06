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
          Unstitched 2-piece and 3-piece suits in Dhanak, Khaddar and Lajwanti. Each suit comes as
          fabric for your own tailor, so you choose the cut and the fit.
        </p>
      </Part>
      <Part title="How we work">
        <p>
          We are online only, with no shop to visit. Every order is arranged with you on WhatsApp:
          we confirm the suit, the price, delivery and payment in the chat, then send it by courier
          anywhere in Pakistan.
        </p>
      </Part>
      <Part title="Who we are">
        <p>
          Mustafa Apparels is run by Mustafa Ahmed. The logo reads MA Apparels by Mustafa Ahmed.
        </p>
      </Part>
    </StaticPage>
  );
}
