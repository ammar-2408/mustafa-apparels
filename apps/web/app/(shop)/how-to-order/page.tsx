import Link from 'next/link';

import { Part, StaticPage } from '../../../components/static-page';
import { getSiteSettings } from '../../../lib/catalog';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'How to order',
  description:
    'How to order an unstitched suit from Mustafa Apparels: choose it online, send it to us on WhatsApp, and get it by courier anywhere in Pakistan.',
  path: '/how-to-order',
});

// Delivery, payment and returns come from the owner's settings in admin. Until they are set,
// the page says only what is already true: both are confirmed with you in the chat.
// TODO-OWNER: payment methods, courier charges and timing, and the returns policy (step 10.2).
export default async function HowToOrderPage() {
  const settings = await getSiteSettings();
  return (
    <StaticPage
      title="How to order"
      path="/how-to-order"
      lead="Choose a suit here, send it to us on WhatsApp, and we send it to you by courier."
    >
      <Part title="1. Choose a suit">
        <p>
          Browse{' '}
          <Link href="/shop" className="link">
            all suits
          </Link>{' '}
          or a collection. Each suit&rsquo;s page lists every piece, its fabric and its design code.
        </p>
      </Part>
      <Part title="2. Send it to us on WhatsApp">
        <p>
          Tap Order on WhatsApp on the suit&rsquo;s page. The message names the suit and its design
          code, so we know exactly which one you mean. You can also call us or email us.
        </p>
      </Part>
      <Part title="3. Delivery">
        <p>
          {settings.delivery_info ??
            `We send every order by courier, anywhere in ${settings.service_area ?? 'Pakistan'}. We confirm the delivery charge and timing with you in the chat.`}
        </p>
      </Part>
      <Part title="Payment">
        <p>
          {settings.payment_info ??
            'We confirm how to pay with you in the chat before your suit is sent. There is no online payment on this site.'}
        </p>
      </Part>
      <Part title="Returns">
        <p>
          {settings.return_policy ?? 'Please ask us on WhatsApp about returns before you order.'}
        </p>
      </Part>
    </StaticPage>
  );
}
