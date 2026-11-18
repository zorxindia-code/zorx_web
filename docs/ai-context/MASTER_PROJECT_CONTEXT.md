# ZORX Website — Master Project Context

> Audit date: 2026-11-18 · Branch: `main` (10 commits; large amount of uncommitted work, see `TECHNICAL_AUDIT.md` §Git)
>
> **Evidence labels used throughout these docs**
> - **[V-code]** verified by reading the source in this repository
> - **[V-browser]** verified in a real browser (Chrome / WebKit / Firefox via Playwright) during the development sessions that built the feature — not re-run during this audit
> - **[Inferred]** reasoned from code, not observed
> - **[Unknown]** not determinable from the repository

---

## 1. What this project is

**ZORX** is an interactive / creative agency (lockup tagline: "INTERACTIVE AGENCY"). This repository is the agency's portfolio website: a **single long, highly animated landing page** built with Next.js. [V-code]

- **Purpose:** present the brand cinematically, showcase services, clients and selected work, and lead visitors to contact the agency.
- **Offices:** the contact map shows **Dubai (UAE)** and **Kerala (India)**. [V-code]
- **Clients:** twelve real client logos are shown, for example Boat Seafood, Press'd Café, Harven and CRAV. [V-code]
- **Target audience** [Inferred from content]: businesses in the UAE and India, mostly hospitality and retail judging by the clients, looking for branding, websites, production and marketing.
- **Development stage:** advanced prototype / pre-launch.
  - The visual experience is largely complete.
  - Business content is missing: contact details, project images, project pages and navigation.
  - Launch infrastructure is missing: SEO and Open Graph metadata, sitemap and robots.txt.

## 2. Stack (installed versions) [V-code]

| Item | Version / choice |
| --- | --- |
| Next.js | **16.4.6** (App Router, Turbopack; `cacheComponents: true`, `partialPrefetching: true`) |
| React / React DOM | **19.3.0** |
| TypeScript | 5.9.3, `strict: true`, alias `@/*` → `src/*` |
| Styling | **Tailwind CSS 4.3.3** via `@tailwindcss/turbopack` (only a little utility use) + **plain global CSS** (`globals.css`) + **component-scoped plain CSS files** imported by components |
| Animation | **GSAP 3.15.1** (ScrollTrigger, SplitText) + `@gsap/react` 2.1.2 (`useGSAP` in the intro); CSS keyframes; SVG SMIL; `requestAnimationFrame`; `requestVideoFrameCallback`; IntersectionObserver |
| Fonts | Outfit (local variable TTF via `next/font/local`), Jost 500 (`next/font/google`) |
| Lint | ESLint 9 + `eslint-config-next` 16.4.6 (core-web-vitals + typescript) |
| Package manager | npm (`package-lock.json`) |
| Backend / DB / CMS / Auth / API routes | **None** — fully static, no `process.env` usage, no `/api` |
| Deployment | **[Unknown]** — no Vercel/Netlify/Docker config in the repository (`.vercel` is only gitignored) |
| Offline tooling | `ffmpeg` (with libvpx-vp9 and hevc_videotoolbox, so macOS) and `sharp` 0.35.5 (a transitive Next.js dependency), used by the scripts in `scripts/` |

> ⚠️ `AGENTS.md`: "This is NOT the Next.js you know" — Next 16 has breaking changes. Read `node_modules/next/dist/docs/` before writing Next-specific code. Known example: `next/image` `priority` is deprecated in favour of `preload` / `loading="eager"` + `fetchPriority`, and `images.qualities` defaults to `[75]`.

## 3. Page composition (the only route `/`) [V-code]

`src/app/page.tsx` renders, top to bottom:

```
<main>
  ZorxExperience     – pinned scroll intro: preloader → bird grows into the O → Z/O/X logo → showreel
  VisionSection      – "Your vision, our expertise" + scrubbed bird-outline animation
  ServicesSection    – Branding / Website / Production / Marketing rows; a real bird video perches on the divider
  ClientsSection     – infinite logo marquee (12 client logos)
  FeaturedWork       – 2×2 grid of 4 projects (placeholder images) + "View All Projects"
</main>
<SiteFooter>
  ContactSection     – "Interested in working together?" + LET'S TALK; 3 Blue Manakins (video) + female (image) on the frame
  OfficesSection     – UAE / India contact columns + traced map with animated bird, pins, map-bird cursor
</SiteFooter>
```

Global: `BirdCursor` (custom cursor) is mounted in `src/app/layout.tsx`. The route-level `src/app/loading.tsx` shows the loader.

There is **no header/navigation, no other route, no 404/error page**. [V-code]

## 4. Brand essentials

- **Colours:** black `#000000`, Ice Blue `#E8F5FF` (CSS) and `#E9F5FF` (the exact Ice Blue baked into the logo PNGs), white.
- **Logo:** three squares, Z / O / X, Ice Blue with negative cut-outs. The O contains the ZORX bird (a simple flying-bird glyph).
- **The bird motif is central:**
  - the intro bird video grows into the O
  - the bird outline in the Vision section
  - real filmed birds perch on the dividers in Services and on the contact frame
  - the bird cursor
  - the bird on the map
- **Typography:** Outfit for almost all text; Jost 500 for the "INTERACTIVE AGENCY" tagline.

Full detail: `DESIGN_SYSTEM.md`.

## 5. Feature status (summary)

| Status | Features |
| --- | --- |
| **Completed** | Cinematic scroll intro, showreel; Vision animation; Services bird perching (4 birds); client marquee; contact frame with manakins; map with flight, pins and map-bird cursor; custom cursor; loaders (intro sun, route/showreel sun); reduced-motion support; responsive layouts |
| **Partially implemented** | Featured Work (layout done, **placeholder images, no links**); Contact (LET'S TALK shown but **not linked**); Offices (**no address / phone / email** — only "CONTACT" + country) |
| **Placeholder / temporary** | "Website" service bird is a temporary demo clip (a woodpecker from `branding.mp4`); project cards use client logos as placeholders |
| **Not implemented** | Navigation/header; project pages / "all projects" route; social-media icons and the "THANKS" footer (planned); SEO/OG/sitemap/robots; analytics; contact form; 404/error pages; tests/CI |
| **Broken** | Nothing known to be broken at the time of audit (lint, `tsc` and the production build pass) [V-code / V-build] |

## 6. How the parts communicate

- **Config → components:** all content, asset paths, measured geometry and tuning live in `src/config/*.ts`. Components import them, and there's no runtime data fetching.
- **Pure logic in `src/lib/`:**
  - layout maths (`zorx/layout.ts`)
  - GSAP timelines (`zorx/timelines.ts`)
  - media helpers (`zorx/media.ts`)
  - bird placement (`services/placement.ts`)
  - the grip line (`services/grip.ts`)
  - map flight (`mapFlight.ts`)
  - generated map data (`contactMap.ts`)
  - browser video support (`videoSupport.ts`)
- **No global state library.** Interactive components keep state in refs and DOM data attributes (`data-ready`, `data-active`, `data-loading`, `data-in`, `data-motion`, `data-visible`, `data-mode`, …) that CSS reacts to. This avoids React re-renders during animation.
- **Cross-component signals through the DOM:**
  - **Intro and Vision:** `ZorxExperience` sets `.zorx-stage[data-ready]` when loading completes. `VisionSection` waits for that attribute (MutationObserver) before building its ScrollTrigger, so its measurements include the intro's pin spacing.
  - **Map cursor:** the map container carries `data-cursor-zone="map"`. The global `BirdCursor` switches to its map-bird mode inside it, using `lib/mapFlight.ts`.
- **Server / client split:**
  - Server components: `page.tsx`, `layout.tsx`, `SiteFooter`, `OfficesSection`, `ContactMap`, `ShowreelSection`, `ZorxLogoReveal`, `Preloader`, `ServiceRow`, `BirdAnimation`, `LoadingIndicator`.
  - Client components (`"use client"`): the eight interactive ones listed in `CODEBASE_MAP.md`.

## 7. Offline asset pipeline (important for any media change)

Media is pre-processed offline. The browser never keys green screens or measures anything at runtime.

| Script | Purpose |
| --- | --- |
| `scripts/process-bird-video.mjs` | Green-screen bird clip → transparent **VP9-alpha WebM** (Chrome / Firefox / Edge) + **HEVC-alpha MP4** (Safari / iOS) + placement JSON (perch line, bounds, feet). Options include line removal, watermark erase (several boxes), tail rebuild, stabilisation, seamless loop crossfade (`--loop-xfade`, `--loop-slots`) and a poster |
| `scripts/measure-bird-grip.mjs` | Per-frame toe positions of the peacock clips → `public/videos/bird/branding-bird-grip.json` |
| `scripts/trace-contact-map.mjs` | Traces the supplied map artwork (`scripts/reference/contact-map.png`) to `public/images/contact-map.svg` + `src/lib/contactMap.ts` |

The exact command for each processed clip is in comments in `src/config/services.ts`, in `src/config/contact.ts`, and in `README.md`, which is partly outdated.

## 8. Where to go next

- `CODEBASE_MAP.md` — every file, what it does, line references
- `DESIGN_SYSTEM.md` — tokens, type, spacing, animation system
- `TECHNICAL_AUDIT.md` — issues and risks, prioritised
- `DEVELOPMENT_ROADMAP.md` — what to build next
- `AI_DEVELOPMENT_RULES.md` — how an AI assistant must work in this repository
- `CHATGPT_HANDOVER.md` — everything above in one self-contained file
