# ZORX — Codebase Map

All facts here are [V-code] unless labelled otherwise. Line numbers were taken on 2026-11-18 and will drift as the code changes.

## 1. Folder structure (excluding node_modules, .next, binaries)

```
zorx_web/
├─ AGENTS.md                 Next 16 warning: read node_modules/next/dist/docs before Next code
├─ README.md                 Intro / asset docs (partly OUTDATED — see TECHNICAL_AUDIT)
├─ next.config.ts            cacheComponents, partialPrefetching, turbopack CSS rule (!)
├─ eslint.config.mjs         next core-web-vitals + typescript
├─ tsconfig.json             strict, alias @/* → src/*
├─ package.json              next 16.4.6, react 19.3.0, gsap ^3.15.1, @gsap/react, tailwind 4.3.3
├─ docs/ai-context/          ← these handover docs
├─ scripts/                  offline media tooling (Node + ffmpeg + sharp)
│  ├─ process-bird-video.mjs   green screen → VP9/HEVC alpha clips + placement JSON
│  ├─ measure-bird-grip.mjs    peacock per-frame toe crossings → grip JSON
│  ├─ trace-contact-map.mjs    map artwork PNG → SVG + src/lib/contactMap.ts
│  └─ reference/contact-map.png  source artwork for the map trace
├─ public/
│  ├─ logo/                  z.png o.png x.png (739² Ice Blue squares), lockups, derived/bird-white.png
│  ├─ icons/                 loading_sun.png (loader ring), zorx-clients.png (logo sheet, source only)
│  ├─ clients/*.webp         12 client logos cut from the sheet
│  ├─ fonts/Outfit/          variable TTF (used) + static/ TTFs (unused) + licence
│  ├─ images/                contact-map.svg (traced), female-bird.png (original, 986 KB)
│  ├─ screens/               design reference screenshots (landing_showreel.jpeg referenced in comments only)
│  └─ videos/
│     ├─ optimized/          loading-bird-ice.mp4, showreel-1080/720.mp4, showreel-poster.jpg  ← served
│     ├─ bird/               processed service birds (*.webm, *-hevc.mp4, *.json, grip JSON) ← served
│     ├─ contact/            manakins.webm / -hevc.mp4 / -poster.webp / .json ← served
│     ├─ bird-videos/        ORIGINAL green-screen sources (not used at runtime)
│     ├─ Loading.mp4         ORIGINAL intro bird (not used at runtime)
│     └─ showreel.mp4        ORIGINAL 80 MB master (gitignored, local only)
└─ src/
   ├─ app/
   │  ├─ layout.tsx          root layout, metadata, Jost font, <BirdCursor/>
   │  ├─ page.tsx            the homepage: section order
   │  ├─ loading.tsx         route Suspense fallback → <LoadingIndicator/>
   │  ├─ globals.css         tokens + intro + vision + services + loader CSS (526 lines)
   │  ├─ icon.png, apple-icon.png   favicons (file-based metadata)
   ├─ components/
   │  ├─ zorx/               intro + showreel (ZorxExperience orchestrator)
   │  ├─ vision/             VisionSection + birdPath.ts (traced bird outline path)
   │  ├─ services/           ServicesSection (bird state machine), ServiceRow, BirdAnimation, font.ts (Outfit)
   │  ├─ clients/            ClientsSection(.tsx/.css) marquee
   │  ├─ work/               FeaturedWork(.tsx/.css)
   │  ├─ contact/            ContactSection(.tsx/.css) LET'S TALK + manakins
   │  ├─ footer/             SiteFooter, OfficesSection(.css), ContactMap, MapMotion
   │  └─ ui/                 BirdCursor(.tsx/.css), LoadingIndicator
   ├─ config/                brand.ts, services.ts, clients.ts, work.ts, contact.ts  ← all content & tuning
   └─ lib/
      ├─ zorx/               layout.ts, timelines.ts, media.ts  (intro maths + GSAP)
      ├─ services/           placement.ts (bird placement), grip.ts (peacock grip line)
      ├─ contactMap.ts       GENERATED map data (markers, bird glyph, route)
      ├─ mapFlight.ts        map-bird cursor behaviour + shared map-flight tuning
      └─ videoSupport.ts     prefersHevcAlpha() (Safari/iOS → HEVC alpha)
```

## 2. Routes

| Route | File | Notes |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | The only page. Statically prerendered (`○` in build output) |
| `/icon.png`, `/apple-icon.png` | `src/app/icon.png`, `apple-icon.png` | File-based metadata icons |
| (loading UI) | `src/app/loading.tsx` | Suspense fallback for route segments |
| — | — | **No** `not-found.tsx`, `error.tsx`, `robots.ts`, `sitemap.ts`, `opengraph-image`, `/api` |

## 3. Component hierarchy

```
RootLayout (server)                         src/app/layout.tsx:24
├─ Home (server)                            src/app/page.tsx
│  ├─ <main>
│  │  ├─ ZorxExperience (client)            src/components/zorx/ZorxExperience.tsx:31
│  │  │  ├─ Preloader (server)              zorx/Preloader.tsx:12  → BirdAnimation (video) + sun ring
│  │  │  ├─ ZorxLogoReveal (server)         zorx/ZorxLogoReveal.tsx:25 → field, O art, Z, X, tagline SVG
│  │  │  └─ ShowreelSection (server)        zorx/ShowreelSection.tsx:11 → reel video + LoadingIndicator
│  │  ├─ VisionSection (client)             vision/VisionSection.tsx:43
│  │  ├─ ServicesSection (client)           services/ServicesSection.tsx:26
│  │  │  ├─ ServiceRow × 4 (server)         services/ServiceRow.tsx:4
│  │  │  └─ BirdAnimation (server)          services/BirdAnimation.tsx:11 → enter/exit <video> per bird + grip line div
│  │  ├─ ClientsSection (client)            clients/ClientsSection.tsx:21
│  │  └─ FeaturedWork (client)              work/FeaturedWork.tsx:20
│  └─ SiteFooter (server)  <footer>         footer/SiteFooter.tsx:13
│     ├─ ContactSection (client)            contact/ContactSection.tsx:22 → PerchedBirds (video + next/image)
│     └─ OfficesSection (server)            footer/OfficesSection.tsx:12
│        └─ ContactMap (server)             footer/ContactMap.tsx:18
│           └─ MapMotion (client)           footer/MapMotion.tsx:13 (SMIL pause/play, touch tap orbit, cursor zone)
├─ BirdCursor (client)                      ui/BirdCursor.tsx:38 (uses lib/mapFlight.ts on the map)
└─ Loading (route fallback)                 app/loading.tsx → LoadingIndicator (ui/LoadingIndicator.tsx:28)
```

**Client components (8):** BirdCursor, ZorxExperience, VisionSection, ServicesSection, ClientsSection, FeaturedWork, ContactSection, MapMotion.

## 4. Important files and responsibilities

### Configuration (content and tuning live here; components read it)
| File | Key exports (line) | Purpose |
| --- | --- | --- |
| `src/config/brand.ts` | `BRAND` :7, `ASSETS` :14, `GEOMETRY` :74, `TUNING` :100 (`loadingMinMs` 2000, `scroll` segments :134) | Intro assets, measured artwork geometry, intro timings |
| `src/config/services.ts` | `SERVICES` (4 rows), `SERVICES_TUNING` :158 | Service labels, bird clips and their placement meta, grip data import, hover delays, playback rate |
| `src/config/clients.ts` | `CLIENT_LOGOS`, `CLIENTS_TUNING` :31 (speed 48 px/s, easeMs 650) | Carousel |
| `src/config/work.ts` | `FEATURED_WORK`, `ALL_PROJECTS_HREF` (null) | 4 featured projects; image and href are null |
| `src/config/contact.ts` | `OFFICES`, `CONTACT_HREF`, `CONTACT_BIRDS` | Office details (all null), LET'S TALK link (null → falls back to the first office email), manakin and female bird asset measurements and the exact processing command |

### Libraries (pure logic)
| File | Key exports (line) | Purpose |
| --- | --- | --- |
| `src/lib/zorx/layout.ts` | `computeLayout(W,H)` :38 | Every intro state (preloader, logo, showreel composition) for any viewport |
| `src/lib/zorx/timelines.ts` | `setInitialState` :73, `buildScrollExperience` :97 | The single pinned, scrubbed GSAP timeline; Z/X move in lockstep with the O (`zxStart = 0` :106) |
| `src/lib/zorx/media.ts` | `waitForEssentials` :6, `createBirdController` :63 | Preload gate (min 2 s / max 3 s), intro bird video play / scrub / hold |
| `src/lib/services/placement.ts` | `placeBird` :40 | Bird scale and position so its feet sit on the divider; text-collision limits |
| `src/lib/services/grip.ts` | `createGrip` :13 | Frame-synced (rVFC) peacock grip-line opacity and toe cut-outs |
| `src/lib/mapFlight.ts` | `MAP_FLIGHT` :8, `createMapFlight` :41 | Map-bird cursor: follow, orbit markers, heading |
| `src/lib/contactMap.ts` | `MAP_*`, `MARKER`, `BIRD_*`, `ROUTE` | GENERATED — do not edit by hand |
| `src/lib/videoSupport.ts` | `prefersHevcAlpha` :7 | UA-based choice of HEVC-alpha vs VP9-alpha |

### Styles
| File | What |
| --- | --- |
| `src/app/globals.css` | `:root` tokens :3–10; Tailwind `@theme inline` :12; intro stage :38+; loader :119–158; loader ring :219+; scroll hint :274+; Vision :328+; Services :440+; grip line :513 |
| `src/components/*/X.css` | Component-scoped **plain global-class** CSS (not CSS Modules — see the warning in §6) |

## 5. Data flow examples

- **Services bird:**
  1. `SERVICES[i].bird` (config) is rendered as two `<video>` elements by `BirdAnimation`.
  2. Hover or tap sets `want` in the `ServicesSection` state machine (idle → entering → perched → exiting).
  3. `placeBird(meta, rowGeometry, side, size, grip?.perchY)` returns a transform, applied with `gsap.set`.
  4. `createGrip` follows the video frames for the peacock.
- **Intro:**
  1. `ZorxExperience` measures (`computeLayout`) and gates on `waitForEssentials` (assets + min 2 s).
  2. It then calls `buildScrollExperience(rig)` and sets `data-ready`.
  3. `data-ready` hides the loader sun, shows the scroll hint, and lets `VisionSection` build its trigger.
- **Contact birds:** `CONTACT_BIRDS` sets CSS custom properties in `PerchedBirds`; `ContactSection.css` positions both birds in `cqw` units. The video loads lazily through IntersectionObserver.
- **Map:**
  1. `ContactMap` (server) renders the static traced SVG `<Image>` with an overlay SVG (pins, SMIL flight).
  2. `MapMotion` (client) pauses SMIL off-screen and handles touch taps.
  3. `BirdCursor` with `mapFlight` handles mouse hover.

## 6. Conventions and gotchas

- **Imports:** `@/…` alias everywhere; default exports for section components; named exports for small shared components (`LoadingIndicator`, `BirdCursor`, `BirdAnimation`, `ServiceRow`, `Preloader`).
- **⚠️ CSS Modules don't work.** `next.config.ts` has the Turbopack rule `"*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" }`, which makes `*.module.css` class maps empty. Components import plain `.css` files with `zorx-`-prefixed global class names instead.
- **State in the DOM:** animation state lives in data attributes and refs, not React state, so there are no re-renders during animation.
- **Generated files:** `src/lib/contactMap.ts`, `public/images/contact-map.svg`, `public/videos/**/*.json`, and the processed clips. Regenerate them with the scripts; don't hand-edit.
- **Next 16 specifics:** `next/image` `priority` is deprecated (use `loading="eager"` + `fetchPriority`); `LayoutProps<"/">` is a global type in layouts; `images.qualities` defaults to `[75]`.
