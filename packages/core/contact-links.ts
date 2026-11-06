// WhatsApp, call and email links (docs/integrations.md). Shared by the admin's reply buttons and,
// from step 6.7, the storefront's contact buttons. Numbers are stored in E.164 (+923…).

const digits = (e164: string) => e164.replace(/\D/g, '');

export const whatsappLink = (e164: string, text?: string) =>
  `https://wa.me/${digits(e164)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telLink = (e164: string) => `tel:+${digits(e164)}`;

export function mailtoLink(email: string, subject?: string, body?: string) {
  const query = new URLSearchParams();
  if (subject) query.set('subject', subject);
  if (body) query.set('body', body);
  // mailto wants %20, not +, for spaces.
  const text = query.toString().replace(/\+/g, '%20');
  // The address is encoded too (keeping @), so a value from settings can't add its own ?cc= or
  // break the link.
  const address = encodeURIComponent(email).replace(/%40/g, '@');
  return `mailto:${address}${text ? `?${text}` : ''}`;
}
