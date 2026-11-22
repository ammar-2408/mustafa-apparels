import { mailtoLink, telLink, whatsappLink } from '@mustafa/core/contact-links';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';

import { emailBody, emailSubject, whatsappLabel, whatsappText } from '../../lib/inquiry-text';
import type { Suit } from '../../lib/types';
import { displayNumber } from '../site/contact-list';
import { MailIcon, PhoneIcon, WhatsAppIcon } from '../site/icons';

export type ShopContact = {
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  delivery: string | null;
  payment: string | null;
  replyNote: string | null;
};

type Props = { suit: Suit; contact: ShopContact };

// WhatsApp first, then Call and Email (docs/design.md §9.2), each naming the suit, and a short
// line on delivery, payment and replies from the owner's settings. Nothing is invented: a line
// the owner hasn't written is left out.
export function SuitContact({ suit, contact }: Props) {
  const notes = [contact.delivery, contact.payment, contact.replyNote].filter(
    (note): note is string => Boolean(note),
  );
  return (
    <div className="flex flex-col gap-4">
      {contact.whatsapp && (
        <a
          href={whatsappLink(contact.whatsapp, whatsappText(suit))}
          className={`${buttonClass('primary')} w-full`}
          target="_blank"
          rel="noopener"
        >
          {whatsappLabel(suit)}
          <ButtonCircle icon={<WhatsAppIcon />} />
        </a>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {contact.phone && (
          <a href={telLink(contact.phone)} className={`${buttonClass('secondary')} flex-1`}>
            <span>
              Call <span className="sr-only">{displayNumber(contact.phone)}</span>
            </span>
            <ButtonCircle icon={<PhoneIcon />} />
          </a>
        )}
        {contact.email && (
          <a
            href={mailtoLink(contact.email, emailSubject(suit), emailBody(suit))}
            className={`${buttonClass('secondary')} flex-1`}
          >
            Email
            <ButtonCircle icon={<MailIcon />} />
          </a>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-small text-muted">
          {notes.map((note) => (
            <li key={note} className="line-clamp-2">
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// On phones, a bar where other shops put "Add to cart" (§9.2). globals.css pads the page bottom
// while it is there, so it never covers content.
export function StickyWhatsApp({ suit, whatsapp }: { suit: Suit; whatsapp: string | null }) {
  if (!whatsapp) return null;
  return (
    <div
      data-sticky-bar
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <a
        href={whatsappLink(whatsapp, whatsappText(suit))}
        className={`${buttonClass('primary')} w-full`}
        target="_blank"
        rel="noopener"
      >
        {whatsappLabel(suit)}
        <ButtonCircle icon={<WhatsAppIcon />} />
      </a>
    </div>
  );
}
