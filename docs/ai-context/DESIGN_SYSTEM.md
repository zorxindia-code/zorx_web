# ZORX — Design System, UI/UX and Animation

Values are [V-code], taken from the CSS and config. Visual descriptions are [V-browser] from development screenshots unless marked [Inferred].

## 1. Visual identity and philosophy

- **Editorial, monochrome, cinematic.** Mostly **black** canvases with **Ice Blue** type and hairlines. One **Ice Blue** section (Services) breaks the rhythm.
- **The bird is the protagonist:**
  - **Logo:** the bird inside the O of the Z/O/X logo.
  - **Vision:** an oversized hairline bird outline.
  - **Services:** real filmed birds that land on the row dividers (peacock, woodpecker, owl, macaw).
  - **Contact:** courting Blue Manakins on the contact frame.
  - **Map and cursor:** a bird on the map and a bird cursor.
- **Motion is scroll-driven and physical.** Animations are tied to scroll (scrubbed, reversible) or to real interaction, never decorative loops behind text. There are no bouncy or springy effects. Easing is mostly `power2/3`, `sine.inOut`, and `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Precision is part of the brand.** Assets are measured: feet are aligned to the 1px dividers to sub-pixel accuracy, Ice Blue CSS matches the PNG pixels exactly, and the map is a vector trace of the supplied artwork.

## 2. Colour tokens

| Token / use | Value | Where |
| --- | --- | --- |
| `--zorx-black` | `#000000` | page background, text on Ice Blue |
| `--zorx-ice` | `#E8F5FF` | primary text/lines on black (`globals.css:5`) |
| `--zorx-ice-art` | `#E9F5FF` | exact fill of `z/o/x.png` (233,245,255); Services background; intro field |
| `--zorx-white` | `#FFFFFF` | intro preloader field, offices UAE column |
| Tailwind theme | `--color-ice`, `--color-black` | `@theme inline` (`globals.css:12`) |
| `TUNING.introBg/introIce` | `#E9F5FF` | `brand.ts` |
| Vision outline | `#252627` (rest) / `#34373A` (drawn) / trail `#AAB4BD` | `globals.css` Vision block, `VisionSection.tsx` |
| Contact frame border | `rgb(233 245 255 / 0.55)` | `ContactSection.css` |
| Offices secondary column | `#8B9097` | `OfficesSection.css` |
| Map sea | `#4781FF` (land `#FFFFFF`) | `public/images/contact-map.svg` |
| Map markers | `#F2353B` | `lib/contactMap.ts` |
| Map bird / cursor bird | `#000000` | |

No dark/light mode switch exists. The site is dark by design (`colorScheme: "dark"`, `themeColor: #000000`).

## 3. Typography

| Family | Source | Variable | Use |
| --- | --- | --- | --- |
| **Outfit** (variable 100–900) | `public/fonts/Outfit/Outfit-VariableFont_wght.ttf` via `next/font/local` (`components/services/font.ts`) | `--font-services` | Vision, Services, Clients, Work, Contact, Offices |
| **Jost 500** | `next/font/google` (`app/layout.tsx`) | `--font-tagline` | "INTERACTIVE AGENCY" tagline (SVG text) |
| system-ui | — | — | `body` fallback |

Key sizes (all fluid `clamp()`):

| Element | Size | Weight / case |
| --- | --- | --- |
| Vision headline | `clamp(2.25rem, 7.8vw, 9.75rem)`, line-height 1.04; mobile `clamp(2rem, 10.6vw, 4rem)` | 500, UPPERCASE |
| Vision paragraph | `clamp(1rem, 1.38vw, 1.75rem)`, lh 1.56 | 400, white |
| Service labels | `clamp(2.6rem, 9vw, 8.75rem)`, lh 1 | 500 outlined (2px stroke painted under an Ice Blue fill) → **700 solid black** when active (variable font interpolation) |
| Primary CTAs (View all projects, Let's talk) | `clamp(1.053rem, 2.106vw, 1.8225rem)` — `.zorx-cta-primary` in `globals.css` | uppercase, 500, 0.05em |
| Contact headline | `clamp(1.5rem, 3.4vw, 3.25rem)`, lh 1.12 | 500, Ice Blue |
| LET'S TALK | `clamp(0.78rem, 1.15vw, 1rem)`, letter-spacing .08em | 600 uppercase, 1px white outline |
| Offices text | `clamp(0.82rem, 1.02vw, 1rem)`, lh 1.6; headings letter-spacing .14em | 600 headings |

## 4. Spacing, layout and grid

- **Section side margins:** `max(1.25rem, 8.2vw)` (Work, Contact, Offices — aligned to one another); Vision uses `--vision-pad: clamp(1.5rem, 8.5vw, 11rem)`.
- **Vertical rhythm:** fluid `clamp()` paddings per section, for example Services `clamp(4rem, 10vw, 9rem)` and Contact top `clamp(5rem, 13vw, 13rem)`, which leaves room for the perched birds.
- **Grids:**
  - **Featured Work:** 2 columns (gaps `5.1vw` / `5.5vw`, 3:2 media), 1 column at ≤640px.
  - **Offices:** `1fr 1fr 2.35fr` → 2 columns with the map spanning full width at ≤960px → 1 column at ≤560px.
- **Units:** container-query units are used (`cqw`, `cqmin`) for the intro stage, contact birds and map. The ClientsSection uses a fluid unit `--u: clamp(0.36px, 0.052vw, 1px)`.
- **Breakpoints** (max-width): **1024** (Vision), **960** (Offices), **640** (Work, Contact, Vision mobile), **560** (Offices). There's also `(hover: hover) and (pointer: fine)` for the cursor and `prefers-reduced-motion` (8 blocks).

## 5. Components and elements

| Element | Look |
| --- | --- |
| Dividers | 1px solid black between Services rows (`border-top`), full width |
| CTAs | Underlined uppercase text, no box (`.zorx-cta` in `globals.css`): 1px line in the text colour ~6px below the capitals, as wide as the text; hover: the line retracts right, redraws from the left (~460ms) — also on a CTA without a destination yet; invisible hit area on links; reduced motion: no line motion. LET'S TALK and View All Projects share `.zorx-cta-primary` (one size / weight / tracking, ×1.35 of the former View All Projects size); the 404 / error pages keep their own size |
| Cards (Work) | Image/placeholder 3:2, title below, hover scale 1.035 on media; client logo faint on placeholder |
| Contact frame | Open: a top line (the birds' perch) and a bottom line only; side borders transparent |
| Border radius | Effectively **none** across the site (sharp, editorial). Exception: map markers (circles) |
| Shadows | None, except a subtle `drop-shadow` glow on the hovered client logo |
| Icons | No icon library. Glyphs are brand bitmaps/SVG (bird, sun ring, scroll-mouse hint drawn in CSS) |
| Navigation | **Does not exist** |

## 6. Animation and interaction system

| Feature | Technology | Code | Behaviour |
| --- | --- | --- | --- |
| Intro preload | CSS + video | `Preloader.tsx`, `globals.css:193–270`, `media.ts` | White field, bird video flapping at centre, **sun ring spinning** (1.4s linear) for the whole loading phase (min 2s, max 3s); fades at `data-ready` |
| Intro scroll story | GSAP ScrollTrigger, pinned, `scrub 0.8` | `timelines.ts:97`, `TUNING.scroll` | 0–140vh: the bird grows into the O while the field contracts **and Z/X slide in in lockstep** (same ease `power2.inOut`); 140–210 the bird video is scrubbed to the logo pose; 210–230 `o.png` fades in; tagline; hold; 320–490 morph into the showreel frame |
| Wing-beat speed | video playbackRate 1→3× | `timelines.ts` onUpdate | |
| Showreel | video, lazy at 55% progress, plays only when visible | `ZorxExperience.tsx`, `ShowreelSection.tsx` | Buffering shows `LoadingIndicator` |
| Vision | GSAP timeline + ScrollTrigger (scrub 1.6, `top 85%` → `bottom 55%`) + SplitText | `VisionSection.tsx:18–21, 150+` | Outline draws from the V notch (9 units), light comet travels the wings (7.5 units), headline mask rise + feathered sweep, paragraph line by line |
| Services birds | GSAP sets + HTML video; state machine | `ServicesSection.tsx` | Hover 750ms (tap 450ms) → bird flies in and perches on the divider below; leave → takes off; playback 1.35× |
| Peacock grip | rVFC-synced CSS mask on a 1px line | `lib/services/grip.ts`, `branding-bird-grip.json` | Line drawn over the train, cut behind the toes, frame by frame |
| Client marquee | CSS keyframe `translate3d(-50%)` on a duplicated track; WAAPI `updatePlaybackRate` for hover ease | `ClientsSection.tsx/.css` | **60 px/s** (was 48); hovered logo scales 1.08 + glow; reduced motion → static scroll row |
| Work / Contact reveals | IntersectionObserver + CSS transitions (`data-motion`, `data-in`) | `FeaturedWork.tsx`, `ContactSection.tsx` | Rise + fade, once |
| Manakins | Transparent looping video (6.42s seamless dissolve loop), lazy, plays only on screen | `ContactSection.tsx` | Poster with reduced motion |
| Map | One bird (`lib/mapFlight.ts`): free flight after the pointer, magnetic spiral into a stable orbit around Dubai / Kerala; office spotlight (other column 20 %, 0.5 s) with a masked rise-and-fade reveal of the newly active office's address lines; radar on the active pin; pins are buttons | `ContactMap.tsx`, `MapMotion.tsx`, `lib/officeSpotlight.ts`, `config/mapInteraction.ts` | Touch / office hover / selection: the map's own bird flies it; reduced motion: no orbit or pulses |
| Cursor | rAF, `mix-blend-mode: difference` | `ui/BirdCursor.tsx/.css` | Bird from the O; scales on link/button/card; on the map it switches to the black map bird, which circles the Dubai / Kerala pins **continuously** while the pointer is near (`lib/mapFlight.ts`, 2.4 s per loop, top speed ≈ 840 px/s) |
| Smooth scrolling | Lenis 1.3.11 on the native document scroll, stepped by `gsap.ticker` (`lagSmoothing(0)`), `ScrollTrigger.update` on each Lenis scroll | `providers/SmoothScrollProvider.tsx`, `config/scroll.ts` | `lerp 0.085`, `wheelMultiplier 0.8`, `syncTouch: false` (native touch); stopped while the preloader locks (`html.zorx-locked`); off with reduced motion |
| THANKS footer | Matter.js (local world, 120 Hz sub-steps, sleeping) + DOM transforms; CSS 3D flip cards | `footer/GravityFooter.tsx/.css`, `lib/footer/gravityWorld.ts` | Release when the icon row reaches the viewport bottom; guided first landing, then free drag / throw / knock; reduced motion → static landed layout |
| Loaders | CSS spin of `loading_sun.png` around a stationary bird | `ui/LoadingIndicator.tsx`, `app/loading.tsx` | 150ms grace fade-in |

**Easing vocabulary:**
- **GSAP:** `power1/2/3`, `sine.inOut`, `none` for scrubbed linear.
- **CSS:** `cubic-bezier(0.22, 1, 0.36, 1)` (expo-out-like) for reveals and hovers.

**Reduced motion:** honoured everywhere. Animations become still or complete states, and videos show posters or last frames.

**Mobile:**
- Same animations; touch replaces hover (tap a service row; tap a map pin for an orbit).
- The custom cursor is disabled on touch and coarse pointers.

**Potential conflicts [Inferred]:**
- Several ScrollTriggers depend on the intro's pin spacing. Vision waits for `data-ready`, and any new ScrollTrigger section must do the same.
- `body { overflow-x: hidden }` together with GSAP pinning works today; changing overflow on ancestors can break the pin.

## 7. Visual consistency notes (no changes made)

- The contact headline reads **"Interested in working together?"**. A later brief referred to it as "READY TO BE IMPRESSED?" — the intended copy is **[Unknown]**.
- Typography is consistent, using Outfit throughout. The tagline uses Jost on purpose, because it matches the official lockup's lettering.
- Two Ice Blue values (`#E8F5FF` and `#E9F5FF`) exist on purpose: the CSS colour versus the exact artwork pixel.
