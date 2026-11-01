# Analytics

Google Analytics 4 (GA4) measures how many visitors become leads. The site has no checkout, so **a lead is the conversion**: a WhatsApp click, a call click or a submitted inquiry.

## 1. Set up GA4

1. https://analytics.google.com → create the account `Mustafa Apparels` and a property: currency **PKR**, time zone **Pakistan**.
2. Add a **Web** data stream for `https://mustafaapparels.com`. Copy the Measurement ID (`G-XXXXXXXXXX`).
3. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` on the **Netlify web site, Production context only**. Unset means no GA4, so previews, the admin and tests stay out of your data.
4. **Admin → Data retention:** set event data to 14 months.
5. In the data stream's **Enhanced measurement**, keep page views and scrolls on, and **turn off site search and form interactions**. We send our own versions, and the built-in site search would send the search text.
6. Keep **Google signals and ads features off**. The CSP only allows GA4 without Ads features.
7. Internal traffic: add your own IP as internal and filter it out, so your own browsing doesn't count.

## 2. Add to the site

- `@next/third-parties/google`'s `<GoogleAnalytics>` in `apps/web/app/layout.tsx`, rendered only when the ID exists. **Storefront only, never admin.**
- All events go through one helper, `apps/web/lib/analytics.ts`, so names stay consistent and privacy rules live in one place:
  ```ts
  track('whatsapp_click', { item_id: product.designCode, placement: 'sticky_bar' });
  ```
- The helper does nothing if GA4 isn't loaded, and never blocks or throws.
- GA4 must not make a page dynamic. The layout reads only a public env var.

**CSP:** the hosts from Google's guide for GA4 without Ads features, on the storefront (`docs/auth-security.md` §3.2):
```
script-src  https://www.googletagmanager.com
img-src     https://www.googletagmanager.com https://*.google-analytics.com
connect-src https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com
```
Check the live page for CSP errors after every change here. Google's list changes from time to time.

## 3. Events

Use Google's recommended event names where one exists, so standard reports fill in.

| Event | When | Parameters | Key event |
|---|---|---|---|
| `page_view` | Automatic | — | |
| `view_item_list` | Collection or shop page loads | `item_list_name`, items (id, name, price) | |
| `select_item` | Click on a product card | `item_list_name`, item | |
| `view_item` | Product page loads | item (id = design code, name, price, category = collection) | |
| `video_play` | Product video starts (first time per page view) | `item_id`, `autoplay` (true/false) | |
| `search` | Search submitted | `query_length`, `results_count`. **Never the search text** | |
| `add_to_wishlist` | Suit saved | item | |
| `sign_up` | Account created | `method: email` | |
| `generate_lead` | Inquiry form submitted successfully | `item_id`, `lead_type: form` | ✅ |
| `whatsapp_click` | WhatsApp button clicked | `item_id`, `placement` | ✅ |
| `call_click` | Call button clicked | `item_id`, `placement` | ✅ |
| `email_click` | Email button clicked | `item_id`, `placement` | |

`placement`: `product_page`, `sticky_bar`, `contact_page`, `footer`, `home_strip`.

Prices are sent as numbers in PKR, with `currency: "PKR"`.

Clicks measure intent, not orders: GA4 can't see what happens inside WhatsApp. To learn real conversion, count orders by hand against `whatsapp_click` now and then.

## 4. Privacy

- **Never send to GA4:** names, emails, phone numbers, inquiry messages, search text, user IDs, or anything else that identifies a person. URLs sent to GA4 must not contain these either. `/search?q=` is the risk, so the helper strips `q` from `page_location` and `page_referrer` on search pages.
- GA4 sets cookies. The Privacy page says so, what it's for, and how to opt out.
- **No cookie banner in v1.** A practical default for a shop selling in Pakistan, not legal advice. If the shop starts targeting the EU or UK, add a consent banner with Consent Mode, or if Pakistan's rules change, revisit.
- `auth` and `account` pages send page views only.

## 5. Set up conversions

After the first real events arrive (usually within a day): **Admin → Events** → mark `generate_lead`, `whatsapp_click` and `call_click` as **key events**.

## 6. Link Search Console

**Admin → Product links → Search Console links** → link `mustafaapparels.com`. This brings search queries into GA4. Publish the Search Console report collection in **Reports → Library** if it doesn't show.

## 7. Test before trusting the numbers

1. Set up the ID on production, then open the live site with the **Google Analytics Debugger** extension or **Admin → DebugView**.
2. Do the whole journey: open a collection, click a product, watch the video, search, save to wishlist, tap WhatsApp, tap Call, submit an inquiry.
3. Confirm each event fires **once**, with the right parameters and no personal data.
4. **Realtime** report shows you. Check that your internal filter is on when you're done.
5. On a real phone, confirm the tap on WhatsApp opens WhatsApp and the event still arrives.

Automated test: `e2e/web/analytics.spec.ts` (`docs/testing-qa.md`).

## 8. What to watch

| Question | Where |
|---|---|
| How many leads this week? | Reports → Engagement → Events: `generate_lead`, `whatsapp_click`, `call_click` |
| Which channel brings leads? | Reports → Acquisition → Traffic acquisition, filtered by key event |
| Which suits get interest? | `view_item` and `whatsapp_click` by `item_id` |
| Which searches find nothing? | `search` with `results_count = 0`. Length only: ask customers what they look for, or add a small admin "no results" log later |
| Mobile vs desktop | Reports → Tech → Overview |

Weekly leads are the main metric in `docs/prd.md` §7.
