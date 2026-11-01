# SEO and GEO

How Mustafa Apparels gets found on Google and Bing and in AI answers. Tags and URL rules in code are in `docs/design.md` §8 and `AGENTS.md` §8. This doc covers everything around them.

**The situation:** an online-only shop selling unstitched suits across Pakistan, with no public address, no named city and a new domain. Ranking takes months, and nothing here can guarantee a position or an AI mention.

**Never name another fashion brand**, including in keywords, FAQ answers or alt text. Don't try to rank for those brands' names (`docs/prd.md` §2).

## 1. Google Search Console

The domain is already verified.

1. **Check which property type you have.** Search Console → Settings → Ownership verification. A **Domain property** covers `www`, `admin` and everything else, and is usually a TXT record at Spaceship. **Keep that record.** If you only have a URL-prefix property for `https://mustafaapparels.com`, add a Domain property too.
2. **After launch:** Sitemaps → submit `https://mustafaapparels.com/sitemap.xml`.
3. **URL Inspection:** request indexing for the home page, `/shop`, the three collections and a few products. It's rate-limited, so don't do every URL; the sitemap handles the rest.
4. **Link GA4:** Settings → Associations (`docs/analytics.md` §6).
5. **Weekly for the first 2 months, then monthly:**

| Report | Look for |
|---|---|
| Pages | Why URLs aren't indexed. Search, account and auth pages under "noindex" are **correct** |
| Performance | Queries, clicks, and which pages get impressions |
| Core Web Vitals | Mobile "Good" for ≥ 75% of visits |
| Shopping / Product snippets, Videos | Structured data errors |

## 2. Sitemap

`/sitemap.xml` is generated from the database (`app/sitemap.ts`) and refreshes when products change.

- **Includes:** home, `/shop`, active collections and their paginated pages, published products, About, Contact, How to Order, FAQ, Privacy, Terms.
- **Excludes:** drafts, archived products, search, account, auth, anything with `noindex`, anything that redirects.
- Absolute URLs on `https://mustafaapparels.com`, with real `lastModified` dates. Don't fake them.

## 3. robots.txt

Live production:
```
User-agent: *
Allow: /
Disallow: /api

Sitemap: https://mustafaapparels.com/sitemap.xml
```

- **Don't block search, account or auth pages.** They use `noindex`, and a crawler blocked by `robots.txt` never reads the tag, so the URLs can still appear in results.
- **Before launch and on previews:** `Disallow: /` (`SITE_INDEXABLE=false`).
- **Admin:** always `Disallow: /`, plus `X-Robots-Tag: noindex, nofollow`.
- AI crawlers are allowed by default (§7).

## 4. Indexing checklist

For every public page: one canonical to itself, unique title and description, one `<h1>`, real text in the server HTML, internal links from the collection pages, and `200` status.

- **New suit:** publish → cache refresh → sitemap updates → IndexNow ping. Nothing else to do.
- **Removed suit:** archive → 404 → drops from the sitemap. Google takes time to drop it.
- **Thin pages hurt.** A product with only a name and price won't rank well. Each needs a real description of the fabric, work and pieces, in your own words, never copied from a poster.
- **Duplicate content:** suppliers and other shops may use the same photos and descriptions. Own text and, eventually, own photos are what set you apart.

## 5. Bing Webmaster Tools and IndexNow

Bing's index also feeds other assistants and search products, and setup is quick.

**Bing Webmaster Tools** (at launch):
1. Sign in at https://www.bing.com/webmasters.
2. My Sites → **Import** → sign in with the Google account that owns Search Console → Allow → select `mustafaapparels.com`. This verifies the site and brings the sitemap over.
3. If you ever lose access to that Google account, verify another way.
4. Confirm the sitemap shows, and check the Site Scan report monthly.

**IndexNow** pushes changed URLs to Bing and other participating engines right away. **Google doesn't use it**, and relies on the sitemap instead.
- Key: `INDEXNOW_KEY`, stored at `https://mustafaapparels.com/<key>.txt`.
- The admin pings automatically on publish, unpublish and slug change (`docs/integrations.md`).
- Only runs when `SITE_INDEXABLE=true`.
- Check: Bing Webmaster Tools → IndexNow shows received URLs.

## 6. Pakistan-wide search ("local SEO" for an online shop)

**No Google Business Profile.** Google requires a location customers can visit, or travelling to customers. An online-only shop doesn't qualify, and a virtual office or a rented mailing address isn't allowed either. Don't create one with a fake address, because that can get it suspended. If you open a real shop later, this changes.

**Instead:**

| Do | How |
|---|---|
| Say where you serve | Plain text on Home, How to Order, Contact and FAQ: "Courier delivery across Pakistan" |
| Structured data | `OnlineStore` with `areaServed: PK`, `contactPoint` and `sameAs`. No address or hours |
| Target real searches | "dhanak suit 3 piece", "khaddar unstitched suit", "winter unstitched suits Pakistan", "embroidered khaddar suit price in Pakistan". Check real demand in Search Console after launch |
| Don't fake cities | No "Dhanak suits in Lahore / Karachi / Islamabad" pages. Doorway pages can harm you. Only add a city page if you have something specific to say about it |
| Language and currency | `en_PK` locale, prices in PKR |
| Consistent details | Same name, WhatsApp number, phone and URL everywhere online |

**Pages worth writing:**
- Collection pages with real text about Dhanak, Khaddar and Lajwanti.
- How to Order.
- FAQ.
- Later, guides such as "How to care for Khaddar" or "Dhanak vs Khaddar for winter". The owner checks fabric facts first, and don't copy text from poster or supplier material.

## 7. AEO and GEO: appearing in AI answers

AEO and GEO mean being quoted by Google's AI features, ChatGPT, Claude, Perplexity and others. It's mostly good SEO plus clear facts. Nobody can guarantee a mention.

| Do | Why |
|---|---|
| **Be crawlable.** Server-rendered HTML; AI crawlers not blocked | Many AI crawlers don't run JavaScript. Motion and 3D are add-ons; text is in the HTML |
| **State facts in plain sentences** | "Mustafa Apparels sells women's unstitched 2-piece and 3-piece suits online and delivers across Pakistan by courier. Orders are placed on WhatsApp." Put this on Home and About |
| **Answer real questions** | FAQ headings as questions, with the answer in the first sentence. E.g. "How do I order?", "Do you deliver across Pakistan?", "What's included in a 3-piece suit?", "Are the suits stitched?" |
| **Keep details consistent** | Same name, what you sell and contact details on the site, socials and directories. `alternateName: "MA Apparels"` links the logo's name to the shop |
| **Structured data** | `OnlineStore`, `Product`, `BreadcrumbList`, `VideoObject`. Match what's visible on the page. Google has limited FAQ rich results, so only add `FAQPage` data if it's currently useful |
| **`llms.txt`** | Provided (`docs/design.md` §8.4). It's cheap, but treat it as a nice extra: it's not an established ranking signal, and not all AI products read it |
| **Earn mentions elsewhere** | AI answers lean on what other sites say (§8) |

**AI crawlers:** the default `robots.txt` allows them all, including `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` and `Google-Extended`. That's the default because this is a shop that wants to be found. To opt out of AI training later, add rules per crawler and check each company's current crawler list. Blocking search-related crawlers also removes you from their answers.

**Never:** invent awards, customer counts, reviews or "best in Pakistan" claims; add `Review` or `AggregateRating` data without real reviews; hide text for crawlers.

**Check quarterly:** ask a few assistants "Where can I buy unstitched Dhanak suits in Pakistan?" and "What is Mustafa Apparels?". Note whether the details are right, and fix the source of anything wrong.

## 8. Backlinks

Quality beats quantity, and a new shop needs only a few real ones.

**Start with (first month):**
1. Your own social profiles (Instagram, Facebook, TikTok, YouTube), each linking to the site. Add them in admin Settings so `sameAs` fills in.
2. WhatsApp Business profile with the website link.
3. Add the site to any existing listing, page or customer group you already have.

**Then (ongoing):**
- Real Pakistani business and fashion directories, only the ones a person might actually use.
- Pakistani fashion bloggers and Instagram pages: send a suit for an honest review. A paid or gifted post should be marked as such.
- Local press or community stories, if there's a real story.
- Customers who post their stitched suit: ask to share it and link back.

**Avoid:** buying links, link farms, automated directory blasts, or comment spam. Google can ignore or penalise them, and they're the usual first upsell from "SEO agencies".

**Later, not v1:** check Google Merchant Center's free listings. Without checkout on the site it may not be eligible, so look at the current rules first.

## 9. Monthly routine (about 30 minutes)

- [ ] Search Console: new errors, top queries, indexed count
- [ ] Bing Webmaster Tools: errors, IndexNow
- [ ] GA4: leads by channel (`docs/analytics.md`)
- [ ] Add or improve one piece of content, based on real queries
- [ ] One new real backlink
