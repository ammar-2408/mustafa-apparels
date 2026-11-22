import { CartIcon, CoinsIcon, PaletteIcon, UserCogIcon } from '../../../components/site/icons';
import { PolicyCard, StaticPage } from '../../../components/static-page';
import { buildMetadata } from '../../../lib/seo';
import { SITE_ART } from '../../../lib/site-art';

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
      sideArt={SITE_ART.policyFabric}
      leaves="left"
    >
      {/* The owner's NEWTERMS.png (2026-11-22): one card a row. */}
      <div className="flex flex-col gap-5">
        <PolicyCard icon={<CartIcon />} title="Ordering">
          <p>
            This website shows our suits and their prices. An order is made only when we confirm it
            with you on WhatsApp, by phone or by email.
          </p>
        </PolicyCard>
        <PolicyCard icon={<CoinsIcon />} title="Prices">
          <p>
            Prices are in Pakistani rupees. The price we confirm with you in the chat is the price
            you pay for the suit; we tell you any delivery charge before you order.
          </p>
        </PolicyCard>
        <PolicyCard icon={<PaletteIcon />} title="Colours">
          <p>
            We show each suit as truly as we can, but colours can look a little different on
            different screens.
          </p>
        </PolicyCard>
        <PolicyCard icon={<UserCogIcon />} title="Your account">
          <p>Keep your password to yourself. You can delete your account at any time.</p>
        </PolicyCard>
      </div>
    </StaticPage>
  );
}
