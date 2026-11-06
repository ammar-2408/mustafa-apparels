import { Part, StaticPage } from '../../../components/static-page';
import { buildMetadata } from '../../../lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy',
  description:
    'How Mustafa Apparels uses your details: your account, the questions you send, and Google Analytics on this site. We never sell your details.',
  path: '/privacy',
});

// TODO-OWNER: the owner reviews this before launch. Not legal advice (ADR-012).
export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy"
      path="/privacy"
      lead="This page says what we keep about you, why, and how to have it removed."
    >
      <Part title="Your account">
        <p>
          If you create an account, we keep your name, your email, your phone number if you add it,
          and the suits you save. Your password is stored only as a scrambled hash, never as you
          typed it. You can delete your account at any time on your account page.
        </p>
      </Part>
      <Part title="Questions you send">
        <p>
          When you send a question, we keep your name, how to reach you and your message, so we can
          answer. If you delete your account, we keep the question without your name or contact
          details.
        </p>
      </Part>
      <Part title="Google Analytics">
        <p>
          We use Google Analytics to see which pages and suits people look at, so we can improve the
          shop. It sets cookies and sends Google details about your visit, such as the pages you
          open and your device. It never receives your name, email, phone or what you type in
          search.
        </p>
      </Part>
      <Part title="Who sees your details">
        <p>
          Only the shop. We use Resend to send emails and Cloudinary to show photos, and we never
          sell your details.
        </p>
      </Part>
      <Part title="Questions about privacy">
        <p>Contact us on WhatsApp or by email, and we will answer.</p>
      </Part>
    </StaticPage>
  );
}
