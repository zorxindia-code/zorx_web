# ZORX Website — Complete Handover for an AI Assistant

> **You have never seen this project before. Read this whole file before answering.** It is self-contained. More detail is in the sibling files in `docs/ai-context/`.
> Audit date 2026-11-18. Labels: **[V-code]** verified in source · **[V-build]** lint/types/build run · **[V-browser]** seen in a real browser during development · **[Inferred]** · **[Unknown]**.

---

## 1. The project in one paragraph

**ZORX** is an interactive / creative agency with offices in **Dubai (UAE)** and **Kerala (India)**. This repository is its portfolio website: a **single, long, scroll-driven landing page** (route `/`) with a cinematic intro and real filmed birds as the recurring motif. The ZORX logo is three Ice Blue squares, **Z O X**, and the O contains a **bird**.

**Stage:** pre-launch. The visual and animation work is largely complete. Business content and launch infrastructure are missing:
- contact details
- project images and pages
- navigation
- SEO metadata, sitemap and robots.txt
- analytics

## 2. Stack [V-code]

| | |
| --- | --- |
| Framework | **Next.js 16.4.6** (App Router, Turbopack), **React 19.3.0**, **TypeScript 5.9** strict |
| Styling | Plain CSS (`src/app/globals.css` + one `.css` per component, global `zorx-` class names), Tailwind 4.3.3 installed (barely used) |
| Animation | **GSAP 3.15** (ScrollTrigger, SplitText), `@gsap/react`, CSS keyframes, rAF, `requestVideoFrameCallback`, IntersectionObserver |
| Smooth scroll / physics | **Lenis 1.3.11** (one instance, stepped by `gsap.ticker`, stopped during the preloader) · **Matter.js 0.20.0** (THANKS footer only, lazy) |
| Fonts | Outfit (local variable TTF, `--font-services`), Jost 500 (Google, `--font-tagline`) |
| Backend / CMS / DB / auth / API / env vars | **None.** Fully static |
| Package manager | npm |
| Deployment | **[Unknown]** — no host config in the repository |
| Media tooling | Offline Node scripts using ffmpeg and sharp in `scripts/` |

Commands: `npm run dev` · `npx eslint .` · `npx tsc --noEmit` · `npm run build && npm start`.

**Critical gotchas:**
1. **Next 16 differs from what you know.** Check `node_modules/next/dist/docs/` before Next-specific code. `next/image` `priority` is deprecated (use `loading="eager"` + `fetchPriority`), and `images.qualities` defaults to `[75]`.
2. **CSS Modules don't work.** A Turbopack rule in `next.config.ts` (`"*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" }`) gives empty class maps. Always use plain CSS files with `zorx-` prefixed classes.
3. **Any ScrollTrigger below the intro must wait for `.zorx-stage[data-ready]`.** The intro pins the stage, and triggers created earlier mis-measure.
4. **For transparent video, pick the format by browser (`prefersHevcAlpha()`), never by `canPlayType`.** Chrome on macOS claims HEVC support but can't do HEVC alpha.

## 3. The page, top to bottom [V-code, V-browser]

`src/app/page.tsx`:
```tsx
<>
  <main>
    <ZorxExperience />   {/* intro + showreel */}
    <VisionSection />
    <ServicesSection />
    <ClientsSection />
    <FeaturedWork />
  </main>
  <SiteFooter />         {/* ContactSection + OfficesSection (map) */}
</>
```
`src/app/layout.tsx` adds the metadata (title and description only), the Jost font and the global `<BirdCursor />`. `src/app/loading.tsx` is the route loading fallback.

### 3.1 Intro + showreel — `src/components/zorx/*`, `src/lib/zorx/*`, `src/config/brand.ts`
- **Preloader:**
  - A white field with the black bird video flapping in the centre (`/videos/optimized/loading-bird-ice.mp4`).
  - Around it, the **sun ring** (`/icons/loading_sun.png`, a hand-drawn circle) spins for the whole loading phase.
  - Scroll unlocks when assets are ready and at least 2 s has passed (3 s maximum). Then `.zorx-stage[data-ready]` is set, the sun fades out and a scroll hint appears.
- **One pinned, scrubbed GSAP timeline** (`buildScrollExperience`, `timelines.ts:97`; units are vh of scrolling, `TUNING.scroll`):
  - **0–140:** the bird video grows into the O; the white field contracts into the O square and turns Ice Blue. **Z enters from the left and X from the right in exact lockstep** (same start, duration and ease), so all three finish together at 140.
  - **140–210:** the bird video is scrubbed to its final pose, which matches `o.png`.
  - **210–230:** `o.png` fades in.
  - Then the "INTERACTIVE AGENCY" tagline and a hold.
  - **320–490:** Z and X shrink outward, the O grows into the showreel frame and the showreel plays (lazy-loaded, plays only on screen; a loader shows while it buffers).
- `computeLayout(W, H)` (`layout.ts:38`) computes every state for any viewport.

### 3.2 Vision — `src/components/vision/VisionSection.tsx`
- Headline "YOUR VISION, OUR EXPERTISE" and a paragraph on black, with an oversized hairline outline of the ZORX bird behind them.
- One GSAP timeline scrubbed by scroll:
  - `trigger: section`, `start: "top 85%"`, `end: "bottom 55%"`, `scrub: 1.6`.
  - The outline draws from the V notch; a "comet" light travels along the wings.
  - The headline rises from masks with a feathered sweep.
  - The paragraph appears line by line (SplitText).
- Slowed down on purpose to feel cinematic.

### 3.3 Services — `src/components/services/*`, `src/config/services.ts`, `src/lib/services/*`
- An Ice Blue section with four full-width rows: **Branding, Website, Production, Marketing**.
- The huge labels are outlined at rest and turn solid black when active.
- Hovering a row (750 ms intent delay; tap delay 450 ms) makes a **real bird video** fly in and **perch on the 1px divider** below the row. Leaving makes it take off.
  - The birds: peacock (Branding), woodpecker (Website, a *temporary demo* clip), owl (Production), macaw (Marketing).
  - Clips are transparent videos with placement JSON. `placeBird()` puts the feet exactly on the divider and keeps the bird clear of the text.
- **Peacock grip:** the peacock stands in front of its own train, which hides the divider. While it's over its spot, a 1px copy of the divider is drawn over the train and cut away behind the toes, frame by frame (`lib/services/grip.ts`, data in `public/videos/bird/branding-bird-grip.json`).

### 3.4 Clients — `src/components/clients/*`, `src/config/clients.ts`
- An infinite horizontal marquee of 12 white client logos on black at 48 px/s.
- The hovered logo scales and glows while the strip glides to a stop. Reduced motion shows a static scrollable row.

### 3.5 Featured Work — `src/components/work/*`, `src/config/work.ts`
- "FEATURED WORK" heading, a 2-column grid of 4 projects (Boat Seafood Restaurant, Press'd Cafe, Harven, Cravo – Resto Cafe), and a "VIEW ALL PROJECTS" button.
- **Images and links are `null`:** the cards show the client logo on a placeholder, and nothing is clickable yet.

### 3.6 Footer — `src/components/footer/SiteFooter.tsx`
- **ContactSection** (`src/components/contact/*`):
  - An outlined frame with "Interested in working together?" and **LET'S TALK**. LET'S TALK opens a WhatsApp chat (`CONTACT_HREF` → `https://wa.me/919778175804`, new tab; 2026-11-18).
  - On the frame's top border, three male **Blue Manakins** (transparent looping video, lazy) perch on the left and the **female** perches on the right — a transparent clip with a controller (see "Female Manakin" below).
- **OfficesSection:**
  - Two "CONTACT" columns, **UAE** (white) and **INDIA** (grey). Address, phone and email are `null`, so only the headings show.
  - A **map** traced from the supplied artwork: blue seas, white land, red ring pins on Dubai and Kerala, and a black bird flying India → UAE (SVG SMIL).
  - With a mouse, the cursor becomes the map's bird and circles a pin when near it. On touch, tapping a pin sends a bird round it.
- **GravityFooter (built):** five social icons and four multilingual flip cards (Gracias/¡Gracias!, Nanni/നന്ദി, Shukran/شكرًا, Xièxiè/谢谢) fall onto a huge outlined THANKS when the icon row reaches the viewport bottom; the letters are solid (traced convex colliders), the A leans on N, the page ends at 80 % of the letters' height. Drag, throw, knock with the cursor; click / tap / Enter / Space flips a card. Social URLs: Instagram and Facebook set (2026-11-18); WhatsApp, LinkedIn, X still `null`.

### 3.7 Global UI
- **`BirdCursor`** (`src/components/ui/`): the white bird from the O follows the mouse (`mix-blend-mode: difference`) and scales on links, buttons and cards. Mouse/fine pointers only.
- **`LoadingIndicator`:** the stationary white bird with the sun ring spinning around it. Used only by `app/loading.tsx` and showreel buffering, with a 150 ms grace delay.

## 4. Design system [V-code]

- **Colours:**
  - `--zorx-black #000000`, `--zorx-ice #E8F5FF`, `--zorx-ice-art #E9F5FF` (the exact pixel colour of the logo PNGs), `--zorx-white #FFFFFF`.
  - Accents: Vision outline `#252627` / `#34373A`, trail `#AAB4BD`; offices grey `#8B9097`; map sea `#4781FF`, pins `#F2353B`.
- **Type:**
  - Outfit for everything; Jost 500 for the tagline.
  - Big fluid sizes, e.g. the Vision headline `clamp(2.25rem, 7.8vw, 9.75rem)` uppercase, service labels `clamp(2.6rem, 9vw, 8.75rem)`.
- **Layout:**
  - Side margins `max(1.25rem, 8.2vw)`, fluid `clamp()` paddings.
  - Breakpoints 1024 / 960 / 640 / 560 (max-width).
  - Container-query units for elements that scale with a container.
- **Shapes:** no border radius, no shadows, 1px hairlines, outlined uppercase letter-spaced buttons, black and Ice Blue only.
- **Motion:**
  - Scroll-scrubbed or interaction-driven, smooth, no bounce.
  - Easing `power1–3`, `sine.inOut`, `cubic-bezier(0.22, 1, 0.36, 1)`.
  - Full `prefers-reduced-motion` support.

Token block (`src/app/globals.css:3–15`):
```css
:root {
  --zorx-black: #000000;
  --zorx-ice: #e8f5ff;
  --zorx-ice-art: #e9f5ff; /* exact Ice Blue of z/o/x.png */
  --zorx-white: #ffffff;
}
@theme inline { --color-ice: var(--zorx-ice); --color-black: var(--zorx-black); }
```

## 5. Architecture and conventions [V-code]

```
src/app/            layout.tsx, page.tsx, loading.tsx, globals.css, icon.png, apple-icon.png
src/components/     zorx/ vision/ services/ clients/ work/ contact/ footer/ ui/   (Section.tsx + Section.css)
src/config/         brand.ts services.ts clients.ts work.ts contact.ts            (ALL content, assets, tuning)
src/lib/            zorx/{layout,timelines,media}.ts services/{placement,grip}.ts mapFlight.ts contactMap.ts(generated) videoSupport.ts
scripts/            process-bird-video.mjs, measure-bird-grip.mjs, trace-contact-map.mjs (+ reference/contact-map.png)
public/             logo/ icons/ clients/ fonts/ images/ videos/{optimized,bird,contact} (+ unused originals)
```
- **Config-driven:** components never hard-code business data. Missing data is `null`, and the UI degrades gracefully.
- **Server components by default.** 8 client islands: BirdCursor, ZorxExperience, VisionSection, ServicesSection, ClientsSection, FeaturedWork, ContactSection, MapMotion.
- **No state library.** Animation state lives in refs and **DOM data attributes**, which CSS reacts to (`data-ready`, `data-active`, `data-in`, `data-motion`, `data-visible`, `data-loading`, `data-mode`).
- **Cross-component signals go through the DOM:**
  - `ZorxExperience` sets `.zorx-stage[data-ready]`, and `VisionSection` waits for it with a MutationObserver.
  - The map container carries `data-cursor-zone="map"`, and `BirdCursor` switches mode there.
- Every effect cleans up: kills tweens, disconnects observers, removes listeners.
- **Generated, don't hand-edit:** `src/lib/contactMap.ts`, `public/images/contact-map.svg`, `public/videos/**/*.json`, processed clips. Each clip's regeneration command is in config comments.

Example config entry (`src/config/services.ts`, abridged):
```ts
{
  id: "branding", label: "Branding",
  bird: {
    id: "branding", side: "left", size: 1.52,
    enter: { webm: "/videos/bird/branding-bird.webm", hevc: "/videos/bird/branding-bird-hevc.v2.mp4" },
    exit:  { webm: "/videos/bird/branding-bird-exit.webm", hevc: "/videos/bird/branding-bird-exit-hevc.v2.mp4" },
    meta: brandingMeta,          // perch line, bounds, feet (from the processing script)
    grip: brandingGrip,          // per-frame toe data (measure-bird-grip.mjs)
  },
}
```

Pattern for a new scroll animation below the intro (from `VisionSection.tsx`):
```ts
const stage = document.querySelector<HTMLElement>(".zorx-stage");
if (!stage || "ready" in stage.dataset) start();
else {
  const mo = new MutationObserver(() => { if ("ready" in stage.dataset) { mo.disconnect(); start(); } });
  mo.observe(stage, { attributes: true, attributeFilter: ["data-ready"] });
}
```

## 6. Status and known issues

**Healthy:** tsc, eslint and the build pass [V-build]. No known broken features.

| ID | Issue | Where | Severity |
| --- | --- | --- | --- |
| E1 | No contact details; LET'S TALK unlinked | `src/config/contact.ts` | High |
| E2 | Featured Work placeholders; no project pages; View All inert | `src/config/work.ts` | High |
| E3 | SEO: only title/description; no OG, metadataBase, sitemap, robots, JSON-LD | `src/app/layout.tsx` | High |
| E4 | Unused original media (~20 MB) and boilerplate SVGs deployed from `public/` | `assets-src/videos/bird-videos/`, `assets-src/videos/Loading.mp4`, `public/*.svg` | Medium |
| E5 | No navigation/header | — | Medium |
| E6 | Lots of uncommitted work; vague commit messages | git | Medium |
| E7 | No 404/error pages | `src/app/` | Medium |
| O1 | "Website" bird is a temporary demo clip | `services.ts` | Medium |
| O2 | README partly outdated (intro colours, Z/X timing, loader) | `README.md` | Low |
| O3 | CSS Modules broken by the Turbopack CSS rule (convention: don't use them) | `next.config.ts` | Medium (trap) |
| O5 | Intro holds scroll for at least 2 s (LCP and first-interaction impact not measured) | `brand.ts:102` | Low–Medium |

Details and recommendations: `TECHNICAL_AUDIT.md`. Roadmap: `DEVELOPMENT_ROADMAP.md`.

## 7. Rules you must follow (summary of `AI_DEVELOPMENT_RULES.md`)

1. Preserve brand identity, animations, architecture and behaviour unless explicitly asked to change them.
2. Make targeted, minimal edits. Don't rewrite whole files or refactor unrelated code.
3. Don't add dependencies without approval. Don't commit, push or deploy unless asked.
4. Never invent contact details, project data or copy. Leave `null` placeholders.
5. Styling: plain CSS with `zorx-` classes, the existing tokens, `clamp()` sizes, `max(1.25rem, 8.2vw)` margins, the existing breakpoints, no radius or shadows, and a reduced-motion state for every animation.
6. Animation:
   - GSAP for scrubbed or orchestrated motion; CSS for simple loops; IntersectionObserver for reveals.
   - Animate only transform, opacity and SVG properties.
   - Pause off-screen work, and clean up on unmount.
   - New ScrollTriggers must wait for `data-ready`.
7. Media: originals stay untouched. Process with the scripts, and re-run the measuring or tracing scripts when their source media changes.
8. Never alter the loader concept (stationary bird + spinning `loading_sun.png`), the synchronized Z/O/X formation, the feet-on-divider alignment, the peacock grip, the traced map, or the manakin composition without an explicit request.
9. After every change: `npx tsc --noEmit`, `npx eslint .`, `npx next build`, and a visual check at 1440 / 1024 / 820 / 390px plus reduced motion. Report what was and wasn't verified.

## 8. Unknowns (ask the user rather than assume)

- Production domain and hosting.
- Final contact details, social accounts and the contact headline copy.
- Project images, case-study content and the URL structure.
- Whether a header or navigation is wanted, and its design.
- Analytics provider; whether a contact form is wanted (and where submissions go).
- Final "Website" service bird footage.

## Updates since the 2026-11-18 audit (all verified in the browser)

| Change | Where |
| --- | --- |
| **THANKS gravity footer** — 5 social icons + 4 multilingual flip cards fall onto the outlined THANKS (Matter.js 0.20.0, lazy-loaded); letters traced from the reference into convex colliders; the A leans 3.2° on N; page ends at 80 % of the letters' height; drag / throw / knock; cards flip (rotateY) on click / tap / Enter / Space | `src/components/footer/GravityFooter.tsx/.css`, `src/lib/footer/{gravityWorld,thanksScene}.ts`, `src/config/socials.ts`, `scripts/trace-thanks.mjs` |
| **Map: one bird** — the map's own flying bird was removed; the cursor's map bird circles Dubai / Kerala **continuously** while the pointer is near (2.4 s per loop since the 2026-11-18 refinement) | `src/components/footer/ContactMap.tsx`, `src/lib/mapFlight.ts` |
| **Global smooth scrolling** — Lenis 1.3.11, one instance, stepped by the GSAP ticker; stopped while `html.zorx-locked` (preloader) | `src/components/providers/SmoothScrollProvider.tsx`, `src/config/scroll.ts`, `src/app/layout.tsx` |
| **Contact frame open** — only the top (perch) and bottom lines show; side borders transparent (same box, birds unchanged) | `src/components/contact/ContactSection.css` |
| **Client carousel 25 % faster** — 48 → **60 px/s** | `src/config/clients.ts` |
| Peacock grip line, Z/O/X lockstep intro, sun loader (stationary bird + spinning `loading_sun.png`), slower Vision scrub | see `DESIGN_SYSTEM.md` |

Social account URLs are still `null` in `src/config/socials.ts` (never invent them).

## Interactive Map 2.0 (after the Lenis update)

- **One bird, two renderers** — `src/lib/mapFlight.ts` owns the bird's flight (map units = the artwork's 1037 × 780 viewBox): states `idle · free-flight · approaching · spiral-orbit · stable-orbit · departing`. Drawn by the site cursor's map bird while the mouse is over the map (BirdCursor's `createMapFlight` API is unchanged), otherwise by `.zorx-map-bird` inside the map (office hovered / focused, pin selected, touch). Ownership passes at the bird's current position; handover is an instant swap — never two map birds.
- **Magnetic spiral** — entry 0.15 / exit 0.205 of the map width (hysteresis); spiral from ≤ 0.14 to 0.05 of the map width over 3 s (2.5 turns, constant angular speed, joins from the bird's own position and turning direction), then a stable circle while the pin stays the goal. Orbit radius compensated for smoothing lag (`√(1+(ωτ)²)`), so the flown radius equals the target. Heading = velocity direction, shortest path, smoothed, turn-rate capped (9 rad/s); slight banking.
- **Office spotlight** — `src/lib/officeSpotlight.ts`: `active = hover ?? proximity ?? selection`. Mirrored by MapMotion as `.zorx-offices[data-active-office]` (other column → opacity 0.2, 0.5 s), `.zorx-map[data-active]` and the active marker's radar (two thin rings, 2.75 s). Columns hovered / keyboard-focused activate their office after 120 ms; on touch a tap on a column selects it. A change of active office reveals that column's address lines (GSAP, masked) — see "Map refinement" below.
- **Pins** — invisible 44 px `<button aria-pressed>`s over the markers: click / tap / Enter / Space selects; the other pin switches; an empty map click or Escape clears. Live status text for screen readers.
- **Tuning** — `src/config/mapInteraction.ts` (fractions of the map width + seconds). Optional trail `enableFlightTrail: false`. Dev-only debug overlay: `?map-debug`.
- **Reduced motion** — no orbit, pulses or radar animation; highlighting and selection work; the map's bird rests beside the active pin.

## SEO foundation (2026-11-18)

See `SEO_AUDIT_AND_IMPLEMENTATION.md`. Key rules: identity / indexing in `src/config/seo.ts`; **`SITE_URL` (build time) is the only source of absolute URLs** — without it the site is noindex; never add a route-level `loading.tsx` to a static page (it hides the content from the server HTML); new pages set their own canonical via the Metadata API and join the sitemap through `published` flags; structured data only with real, visible facts.

## Female Manakin head-turn clip (asset needed)

The contact section's female (`public/images/female-bird.png`) is a single still in a three-quarter, left-facing view. A believable "look right" would show the other side of her face and the area her head now covers, which the still doesn't contain, so it cannot be done by rotating or mirroring a cut-out head (and the brief forbids faking it). The playback path is ready: set `CONTACT_BIRDS.female.motion = { webm, hevc }` in `src/config/contact.ts` and `ContactSection.tsx` → `FemaleMotion` plays it over the still: lazy (600px), only on screen and in a visible tab, never with reduced motion; the still stays underneath as the fallback. (Verified with a temporary test loop in Chrome and WebKit at 1440/820/390: exact overlay, feet error ±0.01px, pause/resume correct.)

Footage required:
- The same bird, same artwork, locked-off camera: body, wing, tail and feet pixel-identical in every frame; only the head and upper neck move.
- Loop (≈5.2s): look left = the still's pose (hold 2s) → turn right (0.5–0.7s) → hold 2s → turn back (0.5–0.7s); first frame = last frame = the still.
- Framing identical to the PNG: 1000 × 1378 canvas (or the same aspect), feet at x≈465, toe curl at y≈1000, so the existing placement numbers stay valid.
- Source: ProRes 4444 / PNG sequence with alpha, or green screen (then key with `scripts/process-bird-video.mjs`); 24–30fps.
- Deliverables: `public/videos/contact/female.webm` (VP9 alpha) + `female-hevc.mp4` (HEVC alpha), ~480px wide is enough (displayed ≤170px).

## Map refinement — cinematic pace, office addresses (2026-11-18)

- **Tuning** (`src/config/mapInteraction.ts`, previous values in comments): orbit 0.833 → **0.42 turns/s** (constant on every circle: tighter never spins faster; `orbitRevsPerSecond` replaces `spiralRevolutions`); spiral 3 → 5.25 s; follow τ 0.085 → 0.17 s; new cursor top speed 1.4 map widths/s (≈ 840 px/s desktop); autonomous top speed 2.2 → 1.1; heading τ 0.1 → 0.154 s, max turn 9 → 5.85 rad/s; join / leave τ 0.22 / 0.12 → 0.38 / 0.21 s; radar 2 → 2.75 s; entry / exit / orbit radii unchanged.
- **Loop** — `mapFlight` now runs on `gsap.ticker`, appended after Lenis's step, so each frame reads the SVG's screen matrix after that frame's scroll (bird–pin distance during Lenis scrolling: 23–36 px before → exactly 30 px). It sleeps when the cursor's bird has settled on a resting pointer (wakes on pointer move, scroll, resize); the map width is cached by a ResizeObserver.
- **Addresses** — `OFFICES[].address` + `phone` (real, supplied 2026-11-18; the temporary placeholders are gone). The city lines (Dubai, United Arab Emirates / Kerala, India) were removed at ZORX's request: each column is CONTACT, country, address, phone.
- **Reveal** — MapMotion: when the active office *changes*, its lines rise 12 px into clipping wrappers (0.65 s, stagger 0.09, power2.out). A gap with no office shorter than `defaultStateDelayMs` (450 ms) is not a change. Never per frame, per revolution or per scroll; a new reveal kills the running one and settles every line. Reduced motion: no reveal; highlighting immediate.
- **Measured** (Chrome, 1440, lab): stable orbit 1.2 → 2.38 s per loop; 200 px pointer jump to 90 % 200 → 417 ms; peak follow 1757 → 840 px/s; autonomous approach to Dubai 1.4 → 2.33 s; reveal count over 6 s of orbit + Lenis scrolling: 1. Known remaining cost: the SVG pin pulses / radar (CSS transform on SVG) cause one small layout per frame while the map is on screen (≈ 3 ms layout + ≈ 9 ms style per second) — unchanged.

## Gravity footer — clipping & collision fix (2026-11-18)

- **Clipping cause** (verified): `.zorx-gravity-stage` had `overflow: clip` — there for the 80 % crop of the letters, but it also cut every object, and the physics ceiling sat exactly on that edge (a drag or hard throw sank bodies into it: up to 181 px cut; up to 68 px at the sides).
- **Layers**: the letters' SVG now carries the crop itself (`overflow: hidden`, viewBox ends on VIEW_H). The objects live in `.zorx-gravity-play`, which reaches `--room` px up into the empty black above the footer (measured live: from the offices grid's bottom + 12 px to the stage; 175 px at 1440), clips only at its own top, the page edges and the stage bottom (so the document never grows), and is `pointer-events: none` — only the objects take pointers. The physics ceiling follows it (14 px inside). The visibility observer watches this whole layer, so an object up in the black space keeps moving.
- **Below the letters** (verified): the only thing under the letters was a floor on the crop line, and the drag spring could pull a body through a letter; such bodies ended embedded or under the letters (lowest point down to 148 px below the page bottom). Now: seven convex invisible plugs (`thanksSupports.ts`, scene units — they scale with the artwork) seal the slits and gaps (page edge–T, T–H, H–A + the hollow under the A, A–N, N–K, K–S, S–edge) a little below the letter tops; letters + plugs form the "ground" (`groundAt` heightfield in `gravityWorld.ts`); drag targets are kept inside the walls, under the ceiling and above the ground; the safety floor sits 1.5 units above the page's last line; a body embedded for 3 checks floats up (ghost to the letters, 3.2 units/step) and is solid again once clear. Landing surfaces kept: H's upper cavity, the A's slope, N's and K's diagonals, the S.
- **Stability**: speed ≤ 30 and spin ≤ 0.4 per 16.7 ms (≤ 15 units per 120 Hz sub-step, thinner than any collider); drawn positions are held inside the walls / ceiling for the sub-step a hard impact sinks a body into them.
- **Debug** (dev only): `?gravity-debug` — letter parts, plugs, ceiling / floor, ground line, live bodies (red while recovering).
- **Verified** (Chrome 1440 / 1024 / 820 / 390 / 320, WebKit 1440 / 390; all nine objects thrown up, dragged into every gap, thrown down, swept, flipped mid-flight): max visible clipping 0 (≤ 0.3 px rounding), nothing below the page, nothing deep, page height / width unchanged, H-cavity landing intact; touch drag at 390 doesn't scroll; reduced motion unchanged. Cost: ~11 ms script/s at rest, ~46 ms/s in aggressive play, physics stopped off screen.

## Client carousel — two logos added (2026-11-18)

Halima Trading LLC and Stepvision International Trading LLC (14 logos now). Supplied in colour; converted to the carousel's white-on-transparent style by `scripts/make-client-logo.mjs` from the untouched originals in `assets-src/clients/` (exact commands in the `src/config/clients.ts` header). Halima: alpha kept, every pixel white. Stepvision (gold on an opaque white ground): coverage from the gold's warmth (red − blue), so the white S and the silver V become knockouts in the white disc; its white, grey-outlined subtitle is filled by outline parity (the counters of O / R / D stay open). Sized by eye against the sheet (artwork 76 / 68 px high); placed between compact logos (after Wash Zone; after M10 Resto). Speed unchanged: the duration follows the measured set width (60 px/s).

## Office addresses, phones, socials (2026-11-18)

- `src/config/contact.ts`: UAE — Office No 147, Emarat Atrium, Sheikh Zayed Road - E11 - Dubai, +971 54 396 2660; India — KFC Building 1st Floor, Kunthipuzha, Mannarkkad, Palakkad - 678762, +91 97781 75804 (phones shown grouped, dialled from the digits). No email yet; LET'S TALK opens WhatsApp (below). Non-breaking spaces in an address line mark a run that never wraps (`keepTogether` in OfficesSection renders it nowrap — Safari breaks after a hyphen otherwise).
- Office text ×1.25 (`.zorx-office` clamp(1.025rem, 1.275vw, 1.25rem); heading likewise).
- `src/config/socials.ts`: Instagram `https://www.instagram.com/zorx_intreactive_ageny/`, Facebook `https://www.facebook.com/profile.php?id=61594189226842` → links in the THANKS footer and the Organization `sameAs`.
- Fix: GravityFooter captured the pointer on the icon's `<li>`, so the click after a press was aimed at the `<li>` and a link never opened; it now captures on the `<a>` (a drag's click is still cancelled). Verified Chrome + WebKit: click and Enter open the URL in a new tab, a drag does not.

## Primary CTAs — larger, one shared style (2026-11-18)

VIEW ALL PROJECTS and LET'S TALK share `.zorx-cta-primary` (`globals.css`): `clamp(1.053rem, 2.106vw, 1.8225rem)` = the former VIEW ALL PROJECTS size × 1.35 at every width (29.2 px at 1440, 21.6 at 1024, 16.9 on phones), weight 500, tracking 0.05em, the underline 5.4–6.4 px under the capitals (`--cta-line: calc(0.491em - 5.04px)`, measured Chrome + WebKit), as wide as the text. The hover redraw now also runs on a CTA without a destination (VIEW ALL PROJECTS still has none — no projects page; LET'S TALK opens WhatsApp). BirdCursor treats `a.zorx-cta-primary` as a button (was `a.zorx-work-button`).

## LET'S TALK → WhatsApp (2026-11-18)

`CONTACT_WHATSAPP = "+91 97781 75804"` and `CONTACT_HREF = https://wa.me/919778175804` (`src/config/contact.ts`). ContactSection renders an external `CONTACT_HREF` as `<a target="_blank" rel="noopener noreferrer">` with a screen-reader hint ("— chat on WhatsApp (opens in a new tab)", derived from the URL); an internal one stays a `Link`. Verified Chrome + WebKit: one new tab with the wa.me URL on click and Enter, the site stays open, keyboard focus ring, bird cursor "button" state, unchanged CTA styling.

## Female Manakin — interactive clip (2026-11-19)

- **Asset**: `assets-src/videos/bird-videos/femalebird.mp4` (1080×1920, 24 fps, 10 s, green screen) → `public/videos/contact/female-bird.webm` (VP9 alpha, 753 KB) + `female-bird-hevc.mp4` (HEVC alpha, 975 KB) + `female-bird-poster.webp` (29 KB) + `female-bird.json`, 480×526, 7.125 s. Command in `src/config/contact.ts`. Keyed with `--key protect --protect-still` (olive plumage kept, spill removed on blurred wings); the source's metal wire removed with `--line-green --line-neutral --line-pad 22` (new `--line-neutral` option: low-chroma pixels in the wire band are wire — the wire has a bright highlight); `--stabilize`; `--loop-xfade 12` makes the clip's end dissolve into its first frame (seam score 3.3 vs 2.1–2.3 for normal frame-to-frame motion).
- **Ranges** (clip s): rest = 0 (= poster); `watch` 0–4.0 (blink, look front / right / back left; ends 23.9 from rest — a small head shift when it returns); `react` 4.0–7.125 (crouch, wing flap, land; flows into the rest pose). Source after 7.6 s faces right — not used.
- **Controller** (`FemaleBird` in ContactSection.tsx): one video, states resting / idle-reaction / cta-reaction / paused. Look-arounds start on the males' courtship bursts (`FEMALE_TUNING.maleCues`, measured peaks 1.08 / 2.50 / 4.17 s of the 6.42 s loop) after a 2.5–4 s rest. LET'S TALK: mouse hover, touch pointerdown (never delays the WhatsApp link) or keyboard focus → the flap, once (1.5 s cooldown, no restart); a look-around near its end runs on into it. Range ends caught per frame (requestVideoFrameCallback; `ended` for the clip end). Off screen / hidden tab: paused, resumes. Lazy (600 px), one format (`prefersHevcAlpha`). Reduced motion or an error: the poster (same pose / place / size). The poster hides while the clip shows (`[data-video]`), or a moving bird would show the resting one through it.
- **Verified** (Chrome + WebKit, 320–1920): video exactly over the poster, perch error 0–0.01 px, same bird height as before (111.5 px at 1440), wings inside the canvas, no overflow; hover → flap in 70–135 ms; 10 rapid hovers don't restart; returns to rest; off-screen pause / resume; touch tap starts the flap and opens WhatsApp; reduced motion: no video requests. Note: Tailwind's source scan now skips `assets-src/` and `scripts/` (`@source not` in globals.css) — some source files carry a macOS privacy attribute (com.apple.macl) that blocked the build from reading them.

## Project page — /work/{slug} (2026-11-19)

- Route `src/app/work/[slug]/page.tsx` (prerendered from `PROJECT_PAGES` = projects with `page` content in `src/config/work.ts`); component `src/components/work/ProjectPage.tsx` + `.css`. First live: Boat Seafood Restaurant (`/work/boat-seafood-restaurant`), linked from its Featured Work card.
- Layout from the agreed 1440 spec (in vw): margins 36, fixed left column 548 (title 60 px, year / services / description 19 px, second text column at 205, description 256 wide, next project ≈ 40 from the bottom), image column 784 (first image portrait 3 : 4 → 784 × 1045, export 1080 × 1440 or 1568 × 2091; then 784 × 500 landscape, 16 gap), sticky header 81. Phones: one column. Black / white / Outfit.
- Content: `page: { year, services, description, website, images }` — all empty for Boat (to be supplied). Empty fields are hidden on the live site; non-indexable builds show marked slots. No images yet → panels with the client logo, faint. Page is noindex until `published: true` (then canonical + sitemap).
- With Cache Components `dynamicParams` is not allowed: unknown slugs call `notFound()` → branded 404 with `noindex`, but HTTP 200 (partial prefetching streams the shell first).

