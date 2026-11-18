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
| Animation | **GSAP 3.15** (ScrollTrigger, SplitText), `@gsap/react`, CSS keyframes, SVG SMIL, rAF, `requestVideoFrameCallback`, IntersectionObserver |
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
  - An outlined frame with "Interested in working together?" and **LET'S TALK**. The button is *not linked yet*: `CONTACT_HREF` is null until an email exists.
  - On the frame's top border, three male **Blue Manakins** (transparent looping video, lazy) perch on the left and a static **female** (`public/images/female-bird.png`) perches on the right.
- **OfficesSection:**
  - Two "CONTACT" columns, **UAE** (white) and **INDIA** (grey). Address, phone and email are `null`, so only the headings show.
  - A **map** traced from the supplied artwork: blue seas, white land, red ring pins on Dubai and Kerala, and a black bird flying India → UAE (SVG SMIL).
  - With a mouse, the cursor becomes the map's bird and circles a pin when near it. On touch, tapping a pin sends a bird round it.
- **Planned and not built:** social icons and a large "THANKS" with multilingual speech bubbles.

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
    enter: { webm: "/videos/bird/branding-bird.webm", hevc: "/videos/bird/branding-bird-hevc.mp4" },
    exit:  { webm: "/videos/bird/branding-bird-exit.webm", hevc: "/videos/bird/branding-bird-exit-hevc.mp4" },
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
| E4 | Unused original media (~20 MB) and boilerplate SVGs deployed from `public/` | `public/videos/bird-videos/`, `public/videos/Loading.mp4`, `public/*.svg` | Medium |
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
