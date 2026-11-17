import Link from 'next/link';

import { Part, StaticPage } from '../../../components/static-page';
import { getSiteSettings } from '../../../lib/catalog';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Questions and answers',
  description:
    'Answers about Mustafa Apparels unstitched suits: what unstitched means, ordering on WhatsApp, courier delivery across Pakistan, payment and fabrics.',
  path: '/faq',
});

// Each heading is a question, answered in its first sentence (docs/seo-geo.md §7).
// TODO-OWNER: the payment and returns answers follow the owner's settings (step 10.2).
export default async function FaqPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage title="Questions and answers" path="/faq">
      <Part title="What does unstitched mean?">
        <p>
          An unstitched suit is the fabric for each piece, ready for your own tailor. A 3-piece suit
          has a shirt, a dupatta and trousers; a 2-piece suit has a shirt and trousers.
        </p>
      </Part>
      <Part title="How do I order?">
        <p>
          Tap Order on WhatsApp on the suit&rsquo;s page and send the message. We confirm the
          details with you in the chat.{' '}
          <Link href="/how-to-order" className="link">
            How to order
          </Link>{' '}
          has the steps.
        </p>
      </Part>
      <Part title="Where do you deliver?">
        <p>We deliver by courier across {settings.service_area ?? 'Pakistan'}.</p>
      </Part>
      <Part title="How do I pay?">
        <p>
          {settings.payment_info ??
            'We confirm how to pay with you on WhatsApp before your suit is sent. There is no online payment on this site.'}
        </p>
      </Part>
      <Part title="Do you have a shop I can visit?">
        <p>No. We are online only, so every order is arranged on WhatsApp, by phone or by email.</p>
      </Part>
    </StaticPage>
  );
}
