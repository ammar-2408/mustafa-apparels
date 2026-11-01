# Launch Checklist

Everything to check before and right after https://mustafaapparels.com goes public. Test on the `develop` preview first; each production deploy costs credits. Tick items in this file in a `docs:` commit, so there's a record.

For later releases, the shorter list in `docs/testing-qa.md` §7 is enough.

## 1. Lighthouse

Mobile, on the **preview** before launch and again on the live site. Run each page 3 times and use the median.

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Home | ≥ 90 | ≥ 95 | ≥ 95 | 100 |
| Collection | ≥ 90 | ≥ 95 | ≥ 95 | 100 |
| Product with video | ≥ 90 | ≥ 95 | ≥ 95 | 100 |
| Contact | ≥ 90 | ≥ 95 | ≥ 95 | 100 |

- [ ] All scores met
- [ ] LCP < 2.5 s, CLS < 0.1, INP < 200 ms on product and collection pages
- [ ] The LCP element is the poster or main photo, never the 3D canvas or a video
- [ ] Test on a slow connection (Fast 3G throttling) too

## 2. Mobile

Most customers are on phones. **Use real devices**, not just the browser's emulator.

- [ ] Android phone (Chrome), iPhone (Safari), one tablet
- [ ] Home → collection → product → WhatsApp: smooth, nothing overlapping
- [ ] WhatsApp button opens WhatsApp with the suit's name, design code and link filled in
- [ ] Call button opens the dialler with +92 306 9558717
- [ ] Muted video plays on scroll, pauses when off-screen, doesn't take over full screen on iPhone
- [ ] Gallery swipe and zoom work
- [ ] Sticky WhatsApp bar doesn't cover content or the home indicator
- [ ] Filters and search usable with the thumb; keyboard doesn't hide inputs
- [ ] Portrait and landscape; no sideways scrolling at 360px
- [ ] Automated: `pnpm test:e2e` passes on all 6 device projects

## 3. Links

- [ ] Crawl the whole site for broken links (e.g. `npx linkinator https://mustafaapparels.com --recurse`), run against the preview first
- [ ] No internal link goes to a redirect
- [ ] Footer, header and social links all work; empty social links are hidden
- [ ] `/this-does-not-exist`, `/products/not-a-real-suit`, `/collections/nope` and `/collections/dhanak/page/999` all show the branded page with a real **404** status
- [ ] `/collections/dhanak/page/1` 301s to `/collections/dhanak`
- [ ] Old product slug permanently redirects (301 or 308) to the new one
- [ ] `www`, `http` and `.netlify.app` all 301 to `https://mustafaapparels.com`

## 4. Forms and buttons

Click every one, on phone and desktop, in the preview.

- [ ] **Inquiry:** valid submit shows success, saves in admin, and the email arrives in Gmail
- [ ] **Inquiry:** each invalid field shows its message; honeypot and rate limit work
- [ ] **Sign up:** verification email arrives, not in spam; link works
- [ ] **Log in / log out:** wrong password gives the generic message
- [ ] **Forgot password:** email arrives, link works once, expired link is rejected
- [ ] **Wishlist:** add and remove; guest gets the login prompt
- [ ] **Account:** edit profile, see inquiries, delete account
- [ ] **Search:** suggestions, typos, no-results message, "dhanak" also finds Lajwanti
- [ ] **Filters and sort:** every filter in `docs/catalog.md` §4 that shows; empty values hidden; URL updates; back button works
- [ ] **Contact links:** WhatsApp, Call, Email everywhere they appear
- [ ] **Admin:** create → upload photo and video → publish → appears on site within a minute → archive → 404
- [ ] **Admin:** rejected uploads show why: wrong type, photo over 10 MB, video over 50 MB or 60 s

## 5. Security

- [ ] `security-auditor` agent reports no blockers
- [ ] `pnpm audit --prod` has no high or critical issues
- [ ] https://securityheaders.com: HSTS, CSP, nosniff, Referrer-Policy, Permissions-Policy all present
- [ ] CSP: cached pages have no nonce; dynamic pages and admin do; browser console shows no violations with GA4 and video on
- [ ] Admin: logged-out visitors go to login; a customer account can't log in; 2FA required
- [ ] Customer session gets 403 on admin actions (`e2e/security`)
- [ ] First admin's password is strong and unique; seed variables removed from hosting
- [ ] No secrets in git: GitHub secret scanning on, `git log` checked for `.env`
- [ ] `Business data/` isn't in git: `git ls-files | grep -i "business data"` prints nothing
- [ ] Cloudinary Media Library: nothing shows another brand's logo, and no left-out file was uploaded
- [ ] Production `BETTER_AUTH_SECRET` and `REVALIDATE_SECRET` differ from preview's
- [ ] Neon backup: weekly `pg_dump` workflow ran once; restore tested

## 6. SEO

- [ ] `seo-auditor` agent reports no blockers; `pnpm test:seo` passes against production URLs
- [ ] `SITE_INDEXABLE=true` and `NEXT_PUBLIC_SITE_URL=https://mustafaapparels.com` on both production sites
- [ ] `curl -s https://mustafaapparels.com | grep -i canonical`: one tag, absolute, in raw HTML
- [ ] `robots.txt` live: allows the site, disallows `/api` only, has the sitemap line
- [ ] `sitemap.xml`: only published, 200, absolute URLs. No drafts
- [ ] `llms.txt` returns 200 and its links work
- [ ] Admin and `develop` preview send `noindex`
- [ ] Rich Results Test passes for a product page and the home page: `Product`, `OnlineStore`, `VideoObject`, `BreadcrumbList`
- [ ] Share a product link on WhatsApp and Facebook: image, title and price look right
- [ ] Favicon shows on a browser tab, phone home screen and Google result
- [ ] Search Console: sitemap submitted, key URLs inspected (`docs/seo-geo.md` §1)
- [ ] Bing: site imported, sitemap there, IndexNow key returns 200 and first ping accepted (`docs/seo-geo.md` §5)
- [ ] No banned brand names in any page's HTML or JSON-LD

## 7. Analytics, hosting and email

- [ ] GA4 ID on production only; DebugView shows each event once, no personal data (`docs/analytics.md` §7)
- [ ] `generate_lead`, `whatsapp_click` and `call_click` marked as key events; Search Console linked
- [ ] Internal traffic filter on
- [ ] `SHOP_INBOX_EMAIL` and admin Settings both have `ammarofficial321@gmail.com`
- [ ] Netlify: credit balance has room for launch-week fixes, usage email confirmed (`docs/deployment.md` §3)
- [ ] Skip rule tested: a docs-only merge built nothing
- [ ] Rollback steps read and understood (`docs/deployment.md` §7)
- [ ] DNS: no leftover parking records; Search Console TXT record still there
- [ ] Email: SPF, DKIM and DMARC all PASS on a real message to Gmail
- [ ] Cloudinary dashboard: usage looks sane after a full test pass

## 8. Owner sign-offs

**Only the owner can complete these. Launch is blocked until each is done, unless marked optional.**

- [ ] **Every `check:` cleared** in the `catalog/` file of each suit being published. Suits with open items stay drafts
- [ ] **Lajwanti photos:** all 5 are small (LAJ-01 is only 384 × 691), and a small poster flower remains in the corner of LAJ-02 to 05. Replaced, retouched, or accepted as they are
- [ ] **Left-out videos:** `dhnk1-VID`, `Laj1vid`, `laj3vid` end on cards with other brands' logos. Re-exported without them, or left out for launch
- [ ] **Video rights:** confirmed for every stock video on the site. The owner's statement below covers photos, and those three videos show another brand's name
- [ ] **The name "Lajwanti":** old posters and videos show it as a line by another brand. Confirmed OK to use as a collection name, or renamed
- [ ] **Own-photo records kept:** on 2026-11-01 the owner stated that they or their team shot all 30 stock photos, so this isn't blocked on permission. Keep the original camera files or shoot records somewhere safe, in case anyone questions it. Not independently verified: the same shots appeared earlier on posters with other brands' names
- [ ] **Payment methods** written (cash on delivery, bank transfer, and so on)
- [ ] **Courier charges and delivery time** written
- [ ] **Return and exchange policy** written. Unstitched fabric has its own considerations, such as whether cut fabric can be returned
- [ ] **About text** approved: true facts only
- [ ] **Fabric descriptions** (Dhanak, Khaddar) checked for accuracy
- [ ] **All products priced** and reviewed; drafts you don't want to sell stay drafts
- [ ] **Privacy and Terms pages** read. Consider having someone qualified look at them
- [ ] Optional: **social links** added
- [ ] Optional: logo name vs shop name is fine: the logo says "MA Apparels by Mustafa Ahmed", and the site says "Mustafa Apparels"

## 9. Launch day

1. Confirm §1–8 on the preview.
2. Follow the going-live order in `docs/deployment.md` §8.
3. Run §3 links and §6 SEO on the live domain.
4. Send one test inquiry and one real WhatsApp message.
5. Tag the release: `git tag v1.0.0 && git push origin v1.0.0`.

## 10. First week

- [ ] Check Netlify credits **every day**, Cloudinary every couple of days
- [ ] Search Console and Bing: crawl errors
- [ ] GA4: leads coming through, nothing odd
- [ ] Reply to every real inquiry; note what customers ask, and add it to the FAQ
- [ ] Any bug: test first, fix on `develop`, check the preview, then merge. Remember that each merge costs credits
