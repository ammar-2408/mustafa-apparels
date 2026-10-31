# Integrations

Each external service is wrapped in one module in `packages/core/integrations/` so it can be mocked in tests and swapped later. No app code calls a vendor SDK directly.

| Service | Module | Purpose | Free plan | Failure behaviour |
|---|---|---|---|---|
| Neon PostgreSQL | `packages/db/client.ts` | All data | Yes | Pages show error boundary; health check alerts |
| Cloudinary | `integrations/images.ts` | Upload signing, metadata check, delete, URL builder | Yes | Admin shows retry; storefront falls back to placeholder |
| Resend | `integrations/email.ts` | Verification, password reset, inquiry notifications | Yes | Inquiry still saved; error logged; reset/verify shows "try again" |
| Upstash Redis | `integrations/rate-limit.ts` | Rate limits | Yes | Fail **open** for search, fail **closed** for login/reset/inquiry (in-memory fallback limiter) |
| WhatsApp | `lib/contact-links.ts` | Click-to-chat links | Free | n/a |
| Google Search Console | — | Indexing, sitemap | Free | n/a |
| Analytics (privacy-friendly) | `lib/analytics.ts` | Events | Free tiers exist | Never blocks UI |

## Cloudinary
- Folder structure: `products/{productId}/{publicId}`, `categories/{categoryId}`, `brand/`.
- Delivery URLs built with `f_auto,q_auto,c_fill,ar_3:4,w_{width}` via a custom `next/image` loader (`apps/web/lib/cloudinary-loader.ts`) so Next.js doesn't re-optimize images.
- Widths for `srcset`: 320, 480, 640, 828, 1080, 1440, 1920.
- `next.config` `images.remotePatterns` allows only `res.cloudinary.com/<cloud_name>/**`.

## Resend
- Templates in `packages/core/integrations/email-templates/` (React Email or plain HTML + text versions).
- Emails: `verify-email`, `reset-password`, `new-inquiry` (to shop), `inquiry-received` (to customer, optional).
- Sender: Resend test sender until a custom domain exists; then verify the domain (SPF/DKIM) for deliverability.

## WhatsApp, phone, email links
```ts
// lib/contact-links.ts
whatsappLink(number, text) // https://wa.me/<digits only, with country code 92...>?text=<encodeURIComponent(text)>
telLink(number)            // tel:+92...
mailtoLink(email, subject, body)
```
Pre-filled WhatsApp text: `Hi! I'm interested in "<dress name>" (PKR <price>): <absolute product URL>`.
Numbers come from `site_setting` (editable in admin), stored in E.164 format (`+923001234567`).

## Analytics events
`inquiry_submitted`, `whatsapp_click`, `call_click`, `email_click`, `search` (query length only, not the text), `wishlist_add`, `signup`. Cookieless provider preferred so no cookie banner is needed; host-provided analytics or a free self-hostable tool both work.

## Future integrations (v2)
- Local payment gateway + cart (requires PRD update and security review).
- Delivery/courier booking.
- Google Business Profile link + reviews.
- Instagram feed on home page (via official API, cached).
- Cloudflare Turnstile on forms if spam appears.
