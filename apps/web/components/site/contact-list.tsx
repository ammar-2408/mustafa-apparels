import { mailtoLink, telLink, whatsappLink } from '@mustafa/core/contact-links';
import { ButtonCircle, buttonClass } from '@mustafa/ui/button';

import { GENERAL_WHATSAPP_TEXT } from '../../lib/nav';
import { MailIcon, PhoneIcon, WhatsAppIcon } from './icons';

export type Contact = { whatsapp: string | null; phone: string | null; email: string | null };

// Show a Pakistani number the way people write it: +92 300 1234567.
export const displayNumber = (e164: string) => e164.replace(/^\+92(\d{3})(\d+)$/, '+92 $1 $2');

// WhatsApp first, then call, then email; anything the owner hasn't set is left out. `bold` gives
// the buttons the Bold sentence-case labels of the redesigned menu (docs/design.md §4).
export function ContactList({
  contact,
  text = GENERAL_WHATSAPP_TEXT,
  bold = false,
}: {
  contact: Contact;
  text?: string;
  bold?: boolean;
}) {
  const label = bold ? 'bold' : 'caps';
  return (
    <ul className="flex flex-col gap-3">
      {contact.whatsapp && (
        <li>
          <a
            href={whatsappLink(contact.whatsapp, text)}
            className={buttonClass('primary', 'w-full', label)}
            target="_blank"
            rel="noopener"
          >
            {bold ? 'WhatsApp Us' : 'WhatsApp us'}
            <ButtonCircle icon={<WhatsAppIcon />} />
          </a>
        </li>
      )}
      {contact.phone && (
        <li>
          <a href={telLink(contact.phone)} className={buttonClass('secondary', 'w-full', label)}>
            Call {displayNumber(contact.phone)}
            <ButtonCircle icon={<PhoneIcon />} />
          </a>
        </li>
      )}
      {contact.email && (
        <li>
          <a
            href={mailtoLink(contact.email)}
            className="link inline-flex min-h-11 items-center gap-3"
          >
            <MailIcon className="size-5" />
            {contact.email}
          </a>
        </li>
      )}
    </ul>
  );
}
