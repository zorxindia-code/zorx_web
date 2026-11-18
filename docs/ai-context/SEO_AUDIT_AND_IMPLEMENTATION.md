# ZORX — SEO Audit & Implementation

Date: 2026-11-18 · Labels: **[Verified]** measured / observed on the local production build · **[Recommendation]** not implemented · **[Needs production]** requires the live domain, hosting or accounts · **[Needs business data]** blocked on information only ZORX can supply.

All Lighthouse numbers are **lab** measurements (Lighthouse 12.8.2, local `next start`, simulated throttling). They are not real-user Core Web Vitals (field data).

---

## 1. Initial audit findings (before any change) [Verified]

| Area | Finding |
| --- | --- |
| Rendering | One static route `/`. **All page content (`<main>…`) was in a hidden streaming container** (`<div hidden id="S:0">`), swapped in by JS behind the route `loading.tsx` fallback (a spinner). Non-JS crawlers / AI fetchers and no-JS users received the spinner; the mobile LCP element was that fallback |
| Metadata | Title "ZORX — Interactive Agency", description "ZORX is an interactive creative agency." Nothing else: no canonical, no Open Graph / X cards, no `metadataBase`, no robots meta |
| robots.txt / sitemap.xml | Both **404** |
| Structured data | None |
| Social image | None (`/opengraph-image` 404) |
| Headings | `h1` = "ZORX" (sr-only); `h2` per section; the Offices section had no heading |
| Links | No `<a href>` on the page: LET'S TALK, project cards and social icons have no destinations (business data missing) |
| Error pages | Default Next 404; no branded error page |
| Accessibility | Lighthouse 96: `aria-label` on a `<p>` (GSAP SplitText), greeting-card button names not starting with their visible text |
| Public assets | `public/` = **148 MB**: unused source videos (green-screen originals, the 80 MB showreel master, the original intro clip), the logo sheet, reference screenshots, unused static fonts and five create-next-app SVGs were all deployable |
| Lighthouse (before) | Mobile **78 / 96 / 100 / 100** (Perf / A11y / BP / SEO) — LCP 3.1 s, TBT 640 ms, CLS 0.012. Desktop **100 / 96 / 100 / 100** — LCP 0.6 s, TBT 10 ms, CLS 0.004 |

### Issues by severity

| Severity | Issue | Status |
| --- | --- | --- |
| **Critical** | Content hidden behind the route loading fallback (not in the visible server HTML) | **Fixed** |
| **Critical** | No production domain → no valid canonical / sitemap / structured-data identifiers | **Prepared** — needs `SITE_URL` [Needs production] |
| **High** | No robots.txt / sitemap.xml / canonical / Open Graph / X cards / structured data | **Fixed** |
| **High** | No contact details (address, phone, email) and no social URLs on the site | **Mostly resolved** 2026-11-18: addresses, phones (`tel:` links), Instagram + Facebook (links + `sameAs`); email, opening hours and the other social URLs still open |
| **High** | Featured projects have no case-study pages; project and "View all" links inert | Architecture prepared; content [Needs business data] |
| **Medium** | ~96 MB of unused source media inside `public/` | **Fixed** (moved to `assets-src/`) |
| **Medium** | No branded 404 / error page | **Fixed** |
| **Medium** | Accessibility failures (SplitText aria-label; card button names) | **Fixed** |
| **Medium** | Small text on phones (greeting cards 9.5 px, project names 11.5 px) — surfaced once content was visible | **Fixed** (≥ 12 px) |
| **Medium** | Mobile Total Blocking Time 640 ms | **Improved** to 110–120 ms (lab) |
| **Low** | Outfit served as TTF (≈56 KB compressed) rather than WOFF2 | Open [Recommendation] |
| **Low** | Share image route is dynamic (ƒ) under Cache Components | Open [Recommendation] |
| **Already optimised** | Static prerender; config-driven content; real text for services, projects, offices; lazy media; videos pause off screen; reduced motion everywhere; `next/font` with `display: swap` | — |

---

## 2. Changes implemented

### Files created
| File | Purpose |
| --- | --- |
| `src/config/seo.ts` | Central SEO config: production origin from `SITE_URL` (validated: https, not localhost, not `*.vercel.app`), `INDEXABLE`, title/description, Open Graph base, services (`SERVICE_PAGES`), verified `sameAs` (from `socials.ts`, nulls excluded), Search Console token |
| `src/lib/seo/structuredData.ts` | Homepage JSON-LD (`Organization`, `WebSite`, 4 × `Service`) + safe serialiser |
| `src/lib/seo/shareImage.tsx` | 1200 × 630 share card: the official white lockup on black (artwork unmodified) |
| `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx` | Share images (Next metadata file convention) |
| `src/app/sitemap.ts` | `/sitemap.xml` |
| `src/app/robots.ts` | `/robots.txt` |
| `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/errors.css` | Branded 404 (real 404 status, Next's noindex) and error page |
| `.env.example` | `SITE_URL`, `SITE_NOINDEX`, `GOOGLE_SITE_VERIFICATION` (un-ignored in `.gitignore`) |
| `assets-src/README.md` | Index of the source media moved out of `public/` |

### Files modified
| File | Change |
| --- | --- |
| `src/app/layout.tsx` | Metadata API: `metadataBase` (only with a verified origin), title default + template `%s \| ZORX`, description, application name, robots (index only when `INDEXABLE`), Open Graph, X card, Search Console verification. Layout stays a Server Component |
| `src/app/page.tsx` | Homepage canonical `/` + Open Graph URL; server-rendered JSON-LD |
| `src/app/loading.tsx` | **Removed** — see §4 |
| `src/components/zorx/ZorxExperience.tsx` | `h1` → "ZORX — Interactive Agency" (the visible lockup + tagline) |
| `src/components/footer/OfficesSection.tsx` | Section heading `h2` "Our offices — Dubai, UAE and Kerala, India" (structural, sr-only) |
| `src/components/vision/VisionSection.tsx` | SplitText `aria: "none"` (no `aria-label` on `<p>`; text stays readable) |
| `src/components/footer/GravityFooter.tsx` | Card name = visible face + "— thank you in {language}"; the hidden face is `aria-hidden` and swaps on flip |
| `src/config/socials.ts`, `GravityFooter.css` | Phone minimum card height 22 → 28 px (text ≥ 12 px) |
| `src/components/work/FeaturedWork.css` | Project names ≥ 12 px on phones |
| `src/config/work.ts` | `slug`, `published` (all `false`), optional `updatedAt` |
| `.gitignore` | `!.env.example`; showreel master path → `assets-src/` |
| Config / script / README comments | Source paths → `assets-src/…` |

### Moved (not deleted) → `assets-src/`
`videos/bird-videos/*` (green-screen originals), `videos/Loading.mp4`, `videos/showreel.mp4` (80 MB master, gitignored), `icons/zorx-clients.png`, `screens/*`, `fonts/Outfit/static/*`. Deleted: the five create-next-app placeholder SVGs. **`public/`: 148 MB → 52 MB.** [Verified: the moved URLs now return 404; nothing at runtime referenced them.]

---

## 3. Metadata, sitemap, robots [Verified on the build]

**Without `SITE_URL`** (local, previews): `<meta name="robots" content="noindex, nofollow">`, `robots.txt` = `Disallow: /`, empty sitemap, no canonical, no JSON-LD.

**With `SITE_URL`** (tested with the reserved test domain `https://zorx.example`):
- `<title>ZORX | Creative &amp; Digital Agency in Dubai and Kerala</title>`, description, `application-name`, `robots: index, follow` (+ `max-image-preview:large` for Googlebot)
- `<link rel="canonical" href="https://zorx.example">` (homepage only — each future page sets its own)
- `og:*` (type, site name, locale, title, description, url, image 1200 × 630 + alt) and `twitter:*` (`summary_large_image`, image + alt)
- `robots.txt`: `Allow: /` + `Sitemap: https://zorx.example/sitemap.xml` — JS / CSS / fonts / media not blocked
- `sitemap.xml`: the homepage only; published service / project pages join automatically (`published: true`, real `updatedAt`). No fake `lastModified`, no `changefreq` / `priority`.

Note: `SITE_URL` is read at **build** time (the sitemap and robots routes are static).

## 4. JavaScript crawlability [Verified]

- **Root cause found and fixed**: `src/app/loading.tsx` wrapped the static homepage in a Suspense fallback; with Cache Components the prerendered HTML shipped the fallback visibly and the real page in a hidden container swapped in by JS. Removing it (the page is fully static — the fallback never helped) puts `<main>` directly in the visible server HTML.
- The server HTML now contains, as plain text: the company name + tagline (h1), the Vision headline and paragraph, the four services, the client names (logo alt text), the four featured projects, the contact headline, both offices (UAE / India) and the map's accessible description, the greetings. No crawler-only content; users and crawlers get the same HTML.
- The intro preloader only locks scrolling; it never hides the content from the HTML or assistive technology. The `<noscript>` fallback (logo) remains.
- The route-level loader no longer exists. `LoadingIndicator` still serves the showreel buffering state; a route that actually fetches data can add its own `loading.tsx` later.

## 5. Structured data [Verified output; external validators [Needs production]]

`@graph` with `Organization` (`@id` `{origin}/#organization`, name, url, logo `/logo/zorx-logo-black.png`, description, `areaServed` Dubai / Kerala; `sameAs` only when social URLs exist), `WebSite` (publisher → Organization), and `Service` × 4 (Branding; Website Design & Development; Media Production; Digital Marketing — provider → Organization; `url` once the service page is published). Values are serialised safely (`<`, `>`, `&` escaped).

**Deferred** (no data): `LocalBusiness` for Dubai and Kerala (address, phone, coordinates and opening hours are null in `src/config/contact.ts` — the decorative map is not a source of coordinates); `BreadcrumbList` and `CreativeWork` (no service / project pages yet); `VideoObject` for the showreel (no duration / upload date / standalone page). No reviews, ratings, FAQs or testimonials.

Validation with the Schema Markup Validator / Rich Results Test needs a public URL [Needs production].

## 6. Local SEO readiness

- Office columns are real HTML (`<address>`, headings); the map is an enhancement (pins are buttons with names, plus a live status line); the active-office fade only lowers opacity (≥ 0.25) and keyboard focus restores it.
- **Update 2026-11-18:** postal addresses and phone numbers for both offices are on the site (real HTML, `tel:` links). Still missing: emails, opening hours. LocalBusiness markup can now be added (on approval).
- Location pages `/locations/dubai` and `/locations/kerala`: not created (no unique content — avoiding doorway pages). Add them only with genuine local content.
- Google Business Profiles: not verified here; see checklist.

## 7. Service & portfolio page readiness

- `SERVICE_PAGES` (`src/config/seo.ts`) and `FEATURED_WORK` (`src/config/work.ts`) carry `slug` + `published`. Sitemap, JSON-LD and (later) links read them.
- Route files are intentionally **not** created: with Cache Components a dynamic route's `generateStaticParams` must return at least one param (empty arrays are a build error), and publishing placeholder pages is excluded. When the first case study exists:
  `src/app/work/[slug]/page.tsx` → `generateStaticParams` from published projects, `dynamicParams = false` (other slugs 404), `generateMetadata` (title, description, canonical `/work/{slug}`, Open Graph image), `CreativeWork` + `BreadcrumbList` JSON-LD; then set `href` on the card and `ALL_PROJECTS_HREF`. Same pattern for `/services/{slug}`.
- Unpublished project slugs return **404** today [Verified].

## 8. Images & video

- Decorative images keep `alt=""`; client logos have their names; map has an accessible description; social icons have names. No keyword-stuffed alt text.
- `next/image` with explicit sizes everywhere; the female manakin is served resized by the optimiser.
- Videos: unchanged and already lazy / paused off screen; `prefersHevcAlpha()` untouched; posters exist for the contact clip and the showreel. Decorative bird clips are not treated as SEO video.
- [Recommendation] A dedicated showreel page with a description and `VideoObject` (needs the real duration and upload date).
- [Recommendation] `o.png` / `x.png` are ~10 KB larger than displayed on phones (Lighthouse); a resized copy could be served — left as is to keep the intro's pixel-exact artwork handoff.

## 9. Performance

| Lab (Lighthouse 12.8.2) | Perf | A11y | Best pr. | SEO | FCP | LCP | TBT | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile — before | 78 | 96 | 100 | 100 | 0.9 s | 3.1 s | 640 ms | 0.012 | 717 KB (JS 223) |
| Mobile — after | **92–95** | **100** | **100** | **100** | 0.9 s | 2.8–3.2 s | **110–120 ms** | 0.012–0.014 | 727 KB (JS 232) |
| Desktop — before | 100 | 96 | 100 | 100 | 0.2 s | 0.6 s | 10 ms | 0.004 | 708 KB |
| Desktop — after | **100** | **100** | **100** | **100** | 0.2 s | 0.6 s | 10 ms | 0.004 | 718 KB |

(Mobile perf / LCP vary run to run; two "after" runs shown as a range. "After" measured with `SITE_URL` set, i.e. the indexable production configuration. Legible text on phones: 58.7 % → 100 %.)

- The mobile LCP element is now the intro preloader's sun ring (~2.8–3.2 s lab), not the old fallback. The intro's deliberate **2 s minimum loading hold** (`TUNING.loadingMinMs`) is part of the approved choreography and was **not changed**. [Recommendation, needs approval] if field data shows a poor LCP, reduce the minimum (e.g. to 1.2 s) or let the hold end as soon as assets are ready.
- Gravity footer, map, Lenis, service birds, carousel: already lazy / paused off screen / sleeping; unchanged and re-verified.
- [Recommendation] Convert the Outfit variable TTF to WOFF2 (≈ 40 % smaller) when a font tool is available (fontTools was not installed; no dependency added). Malayalam / Arabic / Chinese still use system fonts (no downloads).

## 10. Accessibility [Verified]

Lighthouse accessibility 96 → **100** (mobile and desktop). Fixed: prohibited `aria-label` on the Vision paragraph; greeting-card names; small text on phones. Pins, cards, links and buttons are keyboard-operable with visible focus; reduced motion keeps every section complete; the bird cursor is mouse-only and never covers the native interactions on touch.

## 11. Tests

- `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · `npm run build` ✅ (routes: `/` static, `/robots.txt` static, `/sitemap.xml` static, `/opengraph-image` and `/twitter-image` on demand)
- HTTP [Verified]: `/` 200; `/robots.txt` 200; `/sitemap.xml` 200 (valid XML); `/opengraph-image` 200 PNG 1200 × 630; unknown URL 404 with `noindex`; `/work/boat-seafood-restaurant` 404; moved source videos 404.
- Regression [Verified, Chrome (+ earlier WebKit runs)]: intro lock + Z/O/X lockstep; Lenis glide; carousel 60 px/s; contact frame and manakin perch (0 px error); peacock grip line on the divider row; map spiral (30 px stable orbit), spotlight, pins, Escape, keyboard; gravity footer landing, flips, drag, keyboard at 1440 px and touch at 390 px; landscape phone 844 × 390 no overflow; no console errors.
- Not testable here: real phones / trackpads; external validators; field data.

## 12. Outstanding business information [Needs business data]

1. **Production domain** (→ `SITE_URL`) and preferred host form (www or apex).
2. Office details for Dubai and Kerala — **addresses and phones supplied (2026-11-18)**; still missing: email, opening hours (→ `src/config/contact.ts`). An email adds a `mailto:` link; LET'S TALK already opens WhatsApp (2026-11-18).
3. Social profile URLs — **Instagram and Facebook supplied (2026-11-18)** (links + `sameAs`); WhatsApp, LinkedIn, X still missing (→ `src/config/socials.ts`).
4. Case studies: images, descriptions, services delivered, approved copy, dates (→ `src/config/work.ts` + project route).
5. Approved copy for each service page (→ service route).
6. Google Search Console access; analytics choice + consent approach.

## 13. Remaining content recommendations (not implemented — design approval needed)

- A short visible line of service descriptions (one sentence per service) would help both users and search; the current rows show labels only.
- Project cards should become links once case studies exist; "View all projects" needs a listing page.
- A minimal header / navigation (logo + LET'S TALK) once there is more than one page.

## 14. Launch & post-launch checklist

**Before launch**
- [ ] Set `SITE_URL=https://<final-domain>` in the production build environment (build time). Leave it unset (or `SITE_NOINDEX=true`) on previews / staging; protect staging with authentication.
- [ ] Build and check: `/robots.txt` shows `Allow: /` and the sitemap; the homepage has `<meta name="robots" content="index, follow">` and the canonical — **never ship production with noindex**.
- [ ] Redirect the non-canonical host (www ↔ apex) and http → https with a single 301; serve `/videos/*` with byte-range support and long cache headers once filenames are versioned [Needs production].
- [ ] Optional: `GOOGLE_SITE_VERIFICATION` for the HTML-tag method (or verify the domain via DNS).

**After launch**
- [ ] Verify the domain in Google Search Console; submit `/sitemap.xml`; inspect the homepage URL (rendered HTML should show the full content).
- [ ] Validate JSON-LD in the Schema Markup Validator and Rich Results Test.
- [ ] Test the share card (LinkedIn Post Inspector, Facebook Sharing Debugger, X).
- [ ] Monitor Page indexing, Core Web Vitals (field data), queries, crawl errors.
- [ ] Create / verify Google Business Profiles for the Dubai and Kerala offices with the same name / address / phone as the site; then add LocalBusiness markup.
- [ ] As content arrives: publish case studies and service pages (set `published: true`) — sitemap, links and markup follow.

No Search Console submission, indexing or deployment was performed.
