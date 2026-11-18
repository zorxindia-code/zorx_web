# ZORX — Development Status and Roadmap

## 1. Current status

| Category | Items |
| --- | --- |
| **Completed** | Intro preloader (sun spinner) and scroll story (bird → O, synchronized Z/O/X, tagline, showreel morph); showreel lazy playback; Vision section (slowed, cinematic scrub); Services with 4 perching birds and the peacock grip; client marquee; Featured Work layout; contact frame with looping manakins and the female; Offices section with the traced map, flight animation, pins and map-bird cursor; global bird cursor; route/showreel loader; reduced-motion support; responsive layouts |
| **Partially implemented** | Featured Work (no images or links); LET'S TALK (no destination); Offices (no address / phone / email) |
| **Placeholder** | "Website" service bird (demo woodpecker); project placeholders using client logos |
| **In progress** | Footer: Contact and Map done; social icons and the large "THANKS" with multilingual speech bubbles planned (`SiteFooter.tsx` comments) |
| **Not implemented** | Header/navigation, project pages, SEO/OG/sitemap/robots, analytics, 404/error pages, contact form, tests/CI |
| **Broken** | None known (lint, types and build pass) |

There are no TODO/FIXME comments in the source; placeholders are documented in config comments (`work.ts`, `contact.ts`, `services.ts`).

## 2. Prioritised roadmap

### Phase 1 — Critical (content and conversion)
1. Fill in the office details and contact email in `src/config/contact.ts`. LET'S TALK becomes a `mailto:` automatically.
2. Supply project images and decide the project URLs. Fill in `src/config/work.ts` and `ALL_PROJECTS_HREF`.
3. Confirm the contact headline copy.
4. Commit the current work in logical commits.

### Phase 2 — Production readiness
1. SEO: `metadataBase`, Open Graph/Twitter metadata, `app/opengraph-image`, `app/sitemap.ts`, `app/robots.ts`, Organization/LocalBusiness JSON-LD with the two offices.
2. `not-found.tsx` and `error.tsx` in the brand style.
3. Move source media out of `public/` (`bird-videos/`, `Loading.mp4`) and remove the boilerplate SVGs and unused fonts.
4. Choose a host (Vercel is likely [Inferred]) and set cache headers for `/videos/**`.
5. Run `npm audit` and a Lighthouse pass. Record LCP, CLS and interactivity; tune `TUNING.loadingMinMs` if needed.

### Phase 3 — Features
1. Project pages (`app/work/[slug]/page.tsx`) and an "All projects" page, reusing the FeaturedWork card styles.
2. Footer completion: social icons, then "THANKS" with multilingual speech bubbles, as new sections inside `SiteFooter`.
3. Navigation: a minimal header (logo + LET'S TALK) that appears after the intro pin and never fights the pinned stage.
4. Final "Website" service bird footage, processed with `scripts/process-bird-video.mjs`.
5. Optional contact form. It would need an API route or form service and env vars, and must not hide the native cursor in inputs.

### Phase 4 — Quality
1. Update the README, or point it at `docs/ai-context/`.
2. Visual regression tests with Playwright: screenshots at 1440/1024/820/390, reduced motion.
3. CI: lint + `tsc` + build on push.
4. Accessibility pass with a screen reader; keyboard walkthrough.
5. Optionally narrow the Turbopack CSS rule so CSS Modules work (test the whole site).

### Responsive follow-ups
- Verify ≤320px, ≥2560px and landscape phones, especially the intro composition, the contact bird heights versus the section padding, and the map.
