# Integrations

Each external service is wrapped in one module in `packages/core/integrations/` so it can be mocked in tests and swapped later. No app code calls a vendor SDK directly.

| Service | Module | Purpose | Free plan | Failure behaviour |
|---|---|---|---|---|
| Neon PostgreSQL | `packages/db/client.ts` | All data | Yes | Pages show error boundary; health check alerts |
| Cloudinary | `integrations/media.ts` | Upload signing, metadata check, delete, image and video URL builders | Yes | Admin shows retry; storefront falls back to placeholder |
| Resend | `integrations/email.ts` | Verification, password reset, inquiry notifications | Yes | Inquiry still saved; error logged. Sign-up, verify and reset answer the same either way, so the person simply asks again |
| Upstash Redis | `integrations/rate-limit.ts` | Rate limits | Yes | Down, slow (2 s) or over the free plan's limit: the error is logged, then fail **closed** for login, 2FA and password reset, and **open** for everything else, including sign-up, search and the inquiry form (owner's decision, 2026-11-02) |
| IndexNow | `integrations/indexnow.ts` | Tells Bing and others when a URL changes | Free | Logged; never blocks a save |
| WhatsApp | `lib/contact-links.ts` | Click-to-chat links | Free | n/a |
| Google Analytics 4 | `apps/web/lib/analytics.ts` | Events and conversions (`docs/analytics.md`) | Free | Never blocks UI |
| Google Search Console, Bing Webmaster Tools | — | Indexing, sitemap (`docs/seo-geo.md`) | Free | n/a |

## Cloudinary

### Folders and delivery
- Folder structure: `products/{publicId}`, `categories/{categoryId}`, `brand/`. Admin uploads can't use a product ID in the path, because a new product has no ID until it's saved. Imported stock uses `products/imported/{import_key}/`, where `import_key` is the suit's design ID (`docs/catalog.md` §6).
- Image URLs, via a custom `next/image` loader (`apps/web/lib/cloudinary-loader.ts`), so neither Next.js nor Netlify re-optimizes images:
  - **Grid cards:** `f_auto,q_auto,c_fill,g_north,ar_3:4,w_{width}`. `g_north` crops from the top: the default crops from the centre, which would cut the model's head off these tall photos.
  - **Product gallery:** `f_auto,q_auto,c_limit,w_{width}`, so the whole photo shows (`docs/design.md` §2).
- Widths for `srcset`: 320, 480, 640, 828, 1080, 1440, 1920.
- `next.config` `images.remotePatterns` allows only `res.cloudinary.com/<cloud_name>/**`.

### Video
- **Limits:** MP4, MOV, WebM; 50 MB; 60 seconds. Cloudinary's free plan caps a video at 100 MB, so our limit sits well under it.
- **Upload:** signed direct upload with `resource_type=video`. Create the delivery version at upload as an eager transformation, so viewers don't trigger processing.
- **Delivery:** one 720p H.264 MP4 with no audio:
  `https://res.cloudinary.com/<cloud>/video/upload/ac_none,c_limit,w_720,q_auto,vc_h264/<public_id>.mp4`
- **Poster:** `https://res.cloudinary.com/<cloud>/video/upload/so_0,f_auto,q_auto,c_limit,w_720/<public_id>.jpg`, or the admin's chosen `poster_public_id`.
- **Playback rules:** `docs/design.md` §5.2.

### Free plan budget

25 credits a month, shared across storage, delivery and processing. One credit is 1,000 transformations, or 1 GB of storage, or 1 GB of bandwidth. Video processing is metered by seconds: Cloudinary's credit page gives 500 SD or 250 HD seconds per credit, though its pages describe the video rates differently, so check the dashboard.

| Item | Rough use |
|---|---|
| Storing today's stock | About 0.15 credits a month (18 videos ≈ 105 MB, 30 photos ≈ 20 MB) |
| Processing today's 18 videos once | About 1 credit (180 seconds), one-off |
| Everything else | Delivery |

**Estimate (ours, not Cloudinary's):** about 2 MB per product view, so about 10,000 product views a month. Check **Dashboard → Usage** weekly once live, alongside Netlify. If usage passes 15 credits, lower the video bitrate or switch to tap-to-play before thinking about paid plans. Upgrading is the owner's decision.

## Resend

- Sends from a verified subdomain: `Mustafa Apparels <no-reply@updates.mustafaapparels.com>`. Resend requires a verified domain, so this is set up at step 3.1, ahead of the login features. DNS steps: `docs/deployment.md` §5.
- Replies go to `ammarofficial321@gmail.com` (`Reply-To`). The inbox stays Gmail for now; Resend only sends.
- Free plan: 3,000 emails a month, 100 a day, 3 domains. Plenty for this shop; check Resend's pricing page if volumes grow.
- **How it's built (step 3.5):** `createMailer()` in `packages/core/integrations/email.ts` calls Resend's REST API with `fetch` and a 10-second timeout, so there's no SDK dependency. It returns `{ ok }` and never throws. A failure is logged as `[email] <kind> not sent: …`, with no address, token or link.
- **Mock mode:** in development and test, each email is written as JSON to `.e2e-outbox/` in the repo root (git-ignored), and Playwright reads its links (`e2e/support/outbox.ts`). On a preview, mock mode only logs `not sent (mock mode)`, so sign-up there can't be confirmed until the preview runs live.
- **Templates** live in `packages/core/integrations/email-templates.ts`, as plain HTML plus a text version, in the brand's colours, with no images and no tracking.
- **Emails:**
  - `verify-email`: the link lasts 24 hours and signs the person in.
  - `reset-password`: the link lasts one hour and works once.
  - `existing-account`: sent instead of a second account when someone signs up with a registered email.
  - Still to come: `new-inquiry` (to the shop) and `inquiry-received` (to the customer, optional).

## WhatsApp, phone, email links

```ts
// lib/contact-links.ts
whatsappLink(number, text) // https://wa.me/<digits only, with country code 92...>?text=<encodeURIComponent(text)>
telLink(number)            // tel:+92...
mailtoLink(email, subject, body)
```
Pre-filled WhatsApp text: `Hi! I'm interested in "<suit name>" (<design code>, PKR <price>): <absolute product URL>`.
Numbers come from `site_setting` (editable in admin), stored in E.164 format: WhatsApp `+923482799707`, phone `+923069558717`. The email address is `ammarofficial321@gmail.com`. The site shows WhatsApp first, because that's where orders happen.

## IndexNow

- Key: `INDEXNOW_KEY`, 8–128 characters from a–z, A–Z, 0–9 and dashes. Hosted at `https://mustafaapparels.com/<key>.txt`, containing the key. It is public by design, so it isn't a secret.
- When a product is published, unpublished or has its slug changed, the admin sends the URL after revalidation:
  ```http
  POST https://api.indexnow.org/indexnow
  Content-Type: application/json; charset=utf-8

  { "host": "mustafaapparels.com", "key": "<key>", "urlList": ["https://mustafaapparels.com/products/..."] }
  ```
- 200 and 202 count as success. 403, 422 and 429 are logged. A failure never blocks the admin's save.
- Sends nothing unless `SITE_INDEXABLE=true`, so nothing is submitted before launch or from previews.

## Analytics

GA4 on the storefront only. Setup, events and privacy rules: `docs/analytics.md`.

## Future integrations (v2)

- Local payment gateway + cart (requires PRD update and security review).
- Courier booking and tracking.
- Instagram feed on home page (via official API, cached).
- Cloudflare Turnstile on forms if spam appears.
