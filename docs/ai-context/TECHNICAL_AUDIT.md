# ZORX — Technical Audit

Audit date: 2026-11-18. Evidence labels: **[V-code]** read in source · **[V-build]** lint/tsc/build run · **[V-browser]** observed in a browser during development sessions (Playwright: Chrome, WebKit, Firefox at 1440/1024/820/390px) · **[Inferred]** · **[Unknown]**.
Nothing was modified during this audit.

## 1. Health snapshot

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ passes [V-build] |
| `npx eslint .` | ✅ no errors or warnings [V-build] |
| `next build` | ✅ succeeds; `/` statically prerendered [V-build] |
| `npm audit` | ⚪ **not run** (audit was read-only, no network installs) [Unknown] |
| Tests / CI | ❌ none exist [V-code] |
| Git | Branch `main`, 10 commits with uninformative messages ("new", "neew"). **Large uncommitted work**: ~18 modified and ~14 new files/folders (all the footer, contact, map, grip, loader work) [V-code] |

## 2. Rendering and performance

**Rendering strategy [V-code]:**
- One static page (`○`). The page is a server component; 8 client islands hydrate.
- No data fetching. `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts` but barely matter for a single static page.

**Measured or observed [V-browser]:**
- **Preloader:** the intro holds scroll for a minimum of 2s (`TUNING.loadingMinMs`) and a maximum of 3s.
- **Load gating:** service bird clips load only on hover intent; the manakin clip only within 600px of the viewport; the showreel at 55% intro progress.
- **Off-screen playback:** videos pause when off-screen, including the manakins and the map SMIL.

**Potential issues from code inspection [Inferred]:**

| Area | Observation |
| --- | --- |
| LCP / interactivity | The intro's 2 s minimum lock and full-screen pinned stage delay first interaction; LCP is likely the intro video/poster. Not measured with Lighthouse. |
| Page weight | `public/` is **148 MB on disk**. Runtime-served media is much smaller (showreel 9.4 / 19 MB by screen size, bird clips 0.3–3.2 MB each, manakins ~2 MB). Originals in `public/videos/bird-videos/` (~18.5 MB incl. 5.5 MB manakin source) and `public/videos/Loading.mp4` are **deployed publicly but unused**. |
| Female bird image | `public/images/female-bird.png` is 986 KB, but served through `next/image` optimisation (WebP, `sizes`), so the transferred size is small. Fine. |
| GSAP bundle | gsap + ScrollTrigger + SplitText in the client bundle (one-time cost, reasonable for this site). |
| Fonts | Outfit variable TTF (110 KB) via `next/font/local` with `display: swap`. Static Outfit TTFs in `public/fonts/Outfit/static/` are unused but deployed. |
| Re-renders | Very low: animation state lives in refs and data attributes, not React state. |
| Caching | No custom headers. Static assets get Next defaults; `/public` files get no long-term immutable caching by default [Inferred]. |

## 3. SEO and accessibility

**SEO [V-code]:**
- `metadata` contains only a title ("ZORX — Interactive Agency") and description ("ZORX is an interactive creative agency.").
- **No** Open Graph or Twitter cards, no `metadataBase`, no `robots.ts` or `sitemap.ts`, no canonical URL, no structured data (Organization / LocalBusiness).

**Semantics [V-code]:**
- One `<h1>` (sr-only "ZORX" in the intro), an `<h2>` per section, and `<h3>` for cards and office columns.
- `<main>` holds the content sections; `<footer>` holds Contact and Offices.
- The map has `role="img"` with an aria-label. Decorative images use `alt=""`.
- Client logos have alt text; the duplicate marquee copy uses `alt=""`.

**Reduced motion [V-code / V-browser]:** fully supported. Every animation has a still or complete state.

**Keyboard [V-code]:**
- Service rows are `<button aria-pressed>`, and focus triggers the bird.
- Links have `:focus-visible` outlines.
- The custom cursor hides the native cursor globally with `cursor: none !important` while active (mouse only).

**Contrast [Inferred]:** Ice Blue on black and black on Ice Blue are very high contrast. The secondary office column (`#8B9097` on black) is about 6:1, which passes AA.

## 4. Responsive [V-browser unless noted]

- Desktop (1440), laptop (1024), tablet (820) and phone (390) were checked during development: no horizontal overflow, and birds stay aligned to their lines.
- The intro adapts its layout to any viewport through `computeLayout`. On portrait screens Z and X start further out so they stay outside the contracting O field.
- **Touch:**
  - The custom cursor is disabled.
  - Service rows work by tap (tap again to dismiss).
  - Map pins orbit on tap.
- **Not checked:** very small (≤320px) and very large (≥2560px) screens [Unknown]. Landscape phones were only partially considered (the intro ignores URL-bar resizes).

## 5. Code quality and security

- **Strengths:**
  - Strict TypeScript.
  - Configuration-driven content.
  - Thorough explanatory comments.
  - Pure logic in `src/lib`.
  - Careful listener and animation cleanup in effects.
  - No secrets, env vars, API routes or user input handling, so the attack surface is minimal.
- **Security [V-code]:** no backend, no forms, no third-party scripts, and no `dangerouslySetInnerHTML`. Risk is limited to dependency vulnerabilities (`npm audit` not run). `.env*` is gitignored.
- **Hydration:** none observed in the browser [V-browser]. Browser-only code runs inside effects.
- **Duplicate code:** the IntersectionObserver reveal pattern is repeated in `FeaturedWork` and `ContactSection` (small).
- **Dead code / unused files [V-code]:**
  - `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (create-next-app leftovers)
  - `public/screens/logo_landing.jpeg`
  - `public/fonts/Outfit/static/*`
  - `public/icons/zorx-clients.png` (source sheet for the logo cut-outs)
  - `public/videos/Loading.mp4` and `public/videos/bird-videos/*` (sources for the processed clips)
- **Generated artefacts** are committed alongside their sources, which is intentional: map SVG and TS, grip JSON, placement JSONs.
- **Maintainability risks:**
  - Several features depend on **measured pixel data** (perch rows, toe intervals, map trace). Replacing a media file requires re-running the matching script.
  - The README is partly outdated.
  - The commit history doesn't describe the work.

## 6. Prioritised issue table

### Essential (before launch)

| ID | Issue | File(s) | Severity | Root cause | Recommended solution | Impact | Dependencies | Modification risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | No contact details; LET'S TALK is not a link | `src/config/contact.ts` (`OFFICES`, `CONTACT_HREF`) | **High** | Real details never supplied | Fill `OFFICES[].address/phone/email`; LET'S TALK auto-links to the first email (or set `CONTACT_HREF`) | Primary conversion path works | Business info | Low (config only) |
| E2 | Featured Work has placeholder images and no project links; "View All Projects" inert | `src/config/work.ts` | **High** | No project media or pages yet | Add `image` and `href` per project; set `ALL_PROJECTS_HREF`; build project routes | Portfolio credibility | Project content, new routes | Low (config) / Medium (new routes) |
| E3 | Minimal SEO: no OG/Twitter, metadataBase, sitemap, robots, canonical, structured data | `src/app/layout.tsx` | **High** | Not yet implemented | Add `metadata` fields, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image`, Organization JSON-LD | Discoverability, link previews | Production domain | Low |
| E4 | Unused original media deployed publicly (~20 MB), plus boilerplate SVGs | `public/videos/bird-videos/`, `public/videos/Loading.mp4`, `public/*.svg` | Medium | Sources kept next to served files | Move sources to a non-public folder (e.g. `assets-src/`) or Git LFS; keep the scripts' `--in` paths updated | Smaller deploys, no source leakage | Update script paths and README | Low |
| E5 | No navigation/header | — | Medium | Not designed or implemented yet | Decide whether the one-page site needs a minimal header (logo, LET'S TALK); must not fight the pinned intro | Wayfinding | Design decision | Medium (intro pin, z-index) |
| E6 | Commit hygiene: large uncommitted work, uninformative commit messages | git | Medium | Workflow | Commit in logical chunks with descriptive messages | Recoverability | — | None |
| E7 | No 404 / error pages | `src/app/` | Medium | Not implemented | Add `not-found.tsx` and `error.tsx` in the brand style | Robustness | — | Low |

### Optional improvements

| ID | Issue | File(s) | Severity | Root cause | Recommendation | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| O1 | "Website" service bird is a temporary demo clip (woodpecker) | `src/config/services.ts` | Medium | Final footage not supplied | Process the final clip with `process-bird-video.mjs` | Low |
| O2 | README outdated (describes the old intro colours and Z/X timing, the old loader) | `README.md` | Low | Docs not updated with changes | Update it, or point it to `docs/ai-context/` | None |
| O3 | CSS Modules silently broken by the Turbopack CSS rule | `next.config.ts` | Medium (trap) | `"*.css"` rule with `as: "*.css"` | Keep the plain-CSS convention, or narrow the rule (e.g. exclude `*.module.css`) and test | Medium (styles across the site) |
| O4 | Global `cursor: none !important` while the bird cursor is active | `src/components/ui/BirdCursor.css:107` | Low | Design choice | Consider keeping the native cursor for text inputs if forms are added | Low |
| O5 | Intro minimum 2 s scroll lock | `src/config/brand.ts:102` | Low–Medium | Choreography | Measure LCP and interactivity; consider reducing it if metrics suffer | Low (tuning) |
| O6 | Tablet/landscape and ≥2560 px not systematically verified | — | Low | Not tested | Add a viewport test pass | None |
| O7 | Footer future parts (social icons, THANKS) not built | `src/components/footer/SiteFooter.tsx` | — | Planned | Add as new sections inside `SiteFooter` | Low |
| O8 | No analytics | — | Low | Not implemented | Add a privacy-friendly analytics script | Low |
| O9 | Duplicate reveal logic | `FeaturedWork.tsx`, `ContactSection.tsx` | Low | Incremental build | Extract a small `useReveal` hook only if a third use appears | Low |
| O10 | Contact headline copy uncertain ("Interested in working together?" vs "READY TO BE IMPRESSED?") | `ContactSection.tsx` | Low | Conflicting briefs | Confirm with stakeholder | None |

## 7. Technical debt summary

1. Content debt: E1 and E2 (the biggest gap).
2. Launch debt: E3, E7, and analytics.
3. Repository debt: E4, E6, and the README.
4. Configuration trap: O3.
