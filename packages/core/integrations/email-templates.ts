// Account emails, in the brand's plain, friendly tone (docs/design.md §1.5). Plain HTML and text,
// no images or tracking. Each link is the only thing a reader needs to act on.

export type Template = { subject: string; html: string; text: string };

const SHOP = 'Mustafa Apparels';

const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function render(subject: string, lines: string[], action: { label: string; url: string }) {
  const paragraphs = lines.map((line) => `<p style="margin:0 0 16px">${escape(line)}</p>`).join('');
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#FAF7EC;color:#111111;font-family:Montserrat,Arial,sans-serif;font-size:16px;line-height:1.5"><div style="max-width:480px;margin:0 auto;padding:32px 24px"><p style="margin:0 0 32px;letter-spacing:0.2em;text-transform:uppercase;font-size:12px">${SHOP}</p>${paragraphs}<p style="margin:32px 0"><a href="${escape(action.url)}" style="display:inline-block;background:#111111;color:#FAF7EC;padding:14px 32px;text-decoration:none;letter-spacing:0.2em;text-transform:uppercase;font-size:12px">${escape(action.label)}</a></p><p style="margin:0;color:#5C584E;font-size:14px">If the button doesn't work, copy this link into your browser:<br>${escape(action.url)}</p></div></body></html>`;
  const text = [`${SHOP}`, '', ...lines, '', `${action.label}: ${action.url}`].join('\n');
  return { subject, html, text };
}

export const verifyEmail = ({ url }: { url: string }): Template =>
  render(
    `Confirm your email for ${SHOP}`,
    [
      'Thank you for creating an account.',
      'Please confirm your email address to finish. The link works for 24 hours.',
      "If you didn't sign up, you can ignore this email.",
    ],
    { label: 'Confirm email', url },
  );

export const resetPassword = ({ url }: { url: string }): Template =>
  render(
    `Reset your ${SHOP} password`,
    [
      'We received a request to reset your password.',
      'The link works once, for one hour. After the reset, you will be logged out everywhere.',
      "If you didn't ask for this, you can ignore this email. Your password stays the same.",
    ],
    { label: 'Reset password', url },
  );

// Sent instead of a second account, so sign-up never shows whether an email is registered.
export const existingAccount = ({ url }: { url: string }): Template =>
  render(
    `You already have a ${SHOP} account`,
    [
      'Someone, maybe you, tried to create an account with this email address, but you already have one.',
      'If you have forgotten your password, you can set a new one.',
      "If this wasn't you, you can ignore this email.",
    ],
    { label: 'Reset password', url },
  );
