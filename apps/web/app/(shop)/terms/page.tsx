import { Part, StaticPage } from '../../../components/static-page';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Terms',
  description:
    'The terms for using the Mustafa Apparels website and ordering unstitched suits on WhatsApp, with courier delivery across Pakistan.',
  path: '/terms',
});

// TODO-OWNER: the owner reviews these before launch, including payment, delivery and returns
// (step 10.2). Not legal advice.
export default function TermsPage() {
  return (
    <StaticPage
      title="Terms"
      path="/terms"
      lead="These terms cover using this website and ordering suits from Mustafa Apparels."
    >
      <Part title="Ordering">
        <p>
          This website shows our suits and their prices. An order is made only when we confirm it
          with you on WhatsApp, by phone or by email.
        </p>
      </Part>
      <Part title="Prices">
        <p>
          Prices are in Pakistani rupees. The price we confirm with you in the chat is the price you
          pay for the suit; we tell you any delivery charge before you order.
        </p>
      </Part>
      <Part title="Colours">
        <p>
          We show each suit as truly as we can, but colours can look a little different on different
          screens.
        </p>
      </Part>
      <Part title="Your account">
        <p>Keep your password to yourself. You can delete your account at any time.</p>
      </Part>
    </StaticPage>
  );
}
