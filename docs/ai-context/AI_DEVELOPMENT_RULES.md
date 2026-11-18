# Rules for AI-Assisted Development on ZORX

These rules apply to any AI assistant (ChatGPT, Claude, Copilot, …) working on this repository.

## 1. Golden rules

1. **Preserve what exists.** Brand identity, animations, timings, layouts and architecture stay as they are unless the user explicitly asks for a change.
2. **Targeted edits only.** Change the specific lines involved. Don't rewrite whole files, rename things, or "clean up" unrelated code.
3. **Analyse before changing.** Read the relevant config, component, CSS and `lib/` file first. Many values are *measured* (perch rows, toe positions, map coordinates), so never guess them.
4. **No new dependencies** unless the user agrees. The stack is Next 16 + React 19 + GSAP + plain CSS (+ Tailwind available).
5. **Never commit, push or deploy** unless asked. The user has repeatedly required this.
6. **Never invent content.** Contact details, project data and copy must come from the user. Use `null` placeholders, as the configs already do.
7. **Verify.** After changes, run `npx tsc --noEmit`, `npx eslint .` and `npx next build`, and check visually at 1440 / 1024 / 820 / 390px plus reduced motion.

## 2. Next.js 16 specifics

- **Next 16 is not the Next.js in your training data.** Read `node_modules/next/dist/docs/` (App Router docs in `01-app/`) before writing Next-specific code (`AGENTS.md`).
- `next/image`: `priority` is deprecated. Use `loading="eager"` + `fetchPriority="high"` (or `preload`). The default `images.qualities` is `[75]`, and other values are coerced. Use `unoptimized` for SVG and tiny UI bitmaps, as the codebase does.
- Layout props use the global `LayoutProps<"/">` type.
- App Router only. Add routes under `src/app/`. Use file-based metadata (`icon.png`, future `opengraph-image`, `sitemap.ts`, `robots.ts`).

## 3. Component rules

- **Sections:**
  - Live in `src/components/<area>/SectionName.tsx` with a sibling `SectionName.css`, and are default exports.
  - Small shared pieces are named exports in `src/components/ui/`.
- **Server first.** Add `"use client"` only when the component needs effects, refs, events or browser APIs. Keep client islands small (the `ContactMap` server + `MapMotion` client split is the model).
- **Content and tuning go in `src/config/*.ts`** with typed interfaces and explanatory comments. Components read config; they don't hard-code business data.
- **Pure logic goes in `src/lib/`** (geometry, timelines, controllers): framework-free functions that receive elements.
- **Imports:** use `@/…` aliases.
- **Fonts:**
  - Use `servicesFont` (Outfit, `--font-services`) from `src/components/services/font.ts`, and add `${servicesFont.variable}` to the section root.
  - Don't load fonts from Google besides the existing Jost tagline font.

## 4. Styling rules

- **Do NOT use CSS Modules.** The Turbopack rule in `next.config.ts` breaks them (empty class names). Use plain CSS files imported by the component, with **`zorx-` prefixed global class names** (`zorx-<section>-<element>`).
- **Colours:** use the tokens `var(--zorx-black)`, `var(--zorx-ice)`, `var(--zorx-ice-art)` (exact artwork Ice Blue) and `var(--zorx-white)`. Don't introduce new brand colours.
- **Sizes:**
  - Fluid `clamp()` sizes.
  - Side margins `max(1.25rem, 8.2vw)` to align with the Work / Contact / Offices sections.
  - Container-query units (`cqw`) where an element must scale with its container.
- **Breakpoints** in use: 1024, 960, 640, 560 (max-width). Reuse them.
- **Shapes:** no border radius, no shadows, sharp editorial outlines (1px), uppercase letter-spaced buttons.
- **Data attributes** drive visual state (`data-active`, `data-in`, `data-motion`, `data-visible`, `data-ready`, `data-loading`). Prefer them to React state for animation.
- Every animated element needs a `@media (prefers-reduced-motion: reduce)` still state.

## 5. Animation rules

- **GSAP** for scroll-scrubbed or orchestrated motion (ScrollTrigger, SplitText registered where used). Clean up on unmount (`tl.kill()`, `scrollTrigger.kill()`, listeners) — every existing effect does.
- **Any new ScrollTrigger below the intro must wait for `.zorx-stage[data-ready]`.** Follow `VisionSection.tsx`'s MutationObserver pattern; otherwise its start/end are measured without the intro's pin spacing.
- **Smooth scrolling is Lenis** (`SmoothScrollProvider`, options in `src/config/scroll.ts`). There is exactly one instance; it is stepped by `gsap.ticker` (never add another rAF loop or `autoRaf`), feeds `ScrollTrigger.update`, and is stopped while `<html>` has `zorx-locked`. Don't add CSS `scroll-behavior: smooth`, a scroller proxy or a scroll wrapper. Programmatic scrolling: `window.scrollTo` still works (Lenis follows the native scroll).
- **CSS keyframes / transitions** for simple loops and reveals. Use **IntersectionObserver** for once-only reveals (the Work / Contact pattern). Pause anything off-screen.
- **No per-frame React state.** Write transforms or styles directly (rAF, rVFC).
- Animate only `transform`, `opacity` and SVG stroke/mask properties. Don't animate layout properties.
- **Easing vocabulary:** `power1–3`, `sine.inOut`, `cubic-bezier(0.22, 1, 0.36, 1)`. No bounce or elastic.
- **Videos with alpha:** VP9 WebM for Chromium/Firefox and HEVC MP4 for Safari/iOS, chosen with `prefersHevcAlpha()` (`src/lib/videoSupport.ts`). **Never** use `canPlayType("hvc1")`, because Chrome on macOS reports HEVC without alpha support.

## 6. Media rules

- Never modify original assets. Processed copies are produced by the scripts in `scripts/`, and each processed clip's exact command is documented in config comments.
- **Green-screen birds:** `scripts/process-bird-video.mjs` (see its header for options). Put new metadata JSON next to the clip and import it in config.
- **Peacock clip:** if it's replaced, re-run `scripts/measure-bird-grip.mjs`.
- **Map:** generated by `scripts/trace-contact-map.mjs`. Don't edit `src/lib/contactMap.ts` or `public/images/contact-map.svg` by hand.
- Lazy-load heavy media near the viewport, and provide posters for reduced motion.

## 7. Must-preserve elements

- The intro: preloader with the sun spinner (whole loading phase), bird → O growth, **Z/O/X forming in lockstep**, tagline, showreel morph, scroll hint.
- Feet-on-divider alignment of all Services birds, and the peacock grip line.
- The 1px dividers, the outlined → solid service label hover, and the Ice Blue Services background.
- The bird cursor (difference blend) and its map mode.
- The loaders: `loading_sun.png` spinning around the **stationary** bird. Never add another logo or orbiting icon.
- The traced map: exact artwork colours and shapes, Dubai and Kerala pins; **one bird only** — its flight lives in `lib/mapFlight.ts` and is drawn by either the cursor or `.zorx-map-bird`, never both; active office via `lib/officeSpotlight.ts` only; tuning in `config/mapInteraction.ts`.
- The THANKS gravity footer: traced letters = colliders (regenerate with `scripts/trace-thanks.mjs`), the A leaning on N, the 80 % crop, the outer-physics / inner-flip card layers. The crop is the letters' **own** SVG clip — never put `overflow` back on `.zorx-gravity-stage` (it would cut thrown objects); objects live in `.zorx-gravity-play`. If the letters are re-traced, re-check the gap plugs in `src/lib/footer/thanksSupports.ts` with `?gravity-debug` (dev).
- The open contact frame (top and bottom lines only).
- The manakins on the contact frame (males left with a seamless loop, female right).
- Reduced-motion behaviour everywhere.

## 8. When implementing a change

1. Locate the config, component, CSS and lib files involved (see `CODEBASE_MAP.md`).
2. Explain the root cause or plan in one or two sentences.
3. Make minimal edits and keep existing comments accurate. Update comments that the change makes wrong.
4. Run tsc, eslint and build. Verify in a browser at the four widths plus reduced motion.
5. Report the changed files, what was verified, and anything not verified.
