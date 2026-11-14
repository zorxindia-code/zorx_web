# ZORX — Landing Experience

Next.js 16 · React 19 · TypeScript · Tailwind 4 · GSAP 3 + ScrollTrigger · HTML5 video.

```bash
npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build && npm start
```

## Two separate loading systems

1. **Cinematic intro** (landing page only) — the original bird video, below.
2. **Normal loading indicator** — `src/components/ui/LoadingIndicator.tsx`: a small (24–40 px) static white bird on transparent, cut from `o.png` (`public/logo/derived/bird-white.png`, 6 KB). Never plays a video, never triggers the intro. Used by the showreel's buffering state and the route-level `src/app/loading.tsx`.

## Cinematic intro sequence

**01 — Loading (automatic, ~2 s).** Ice Blue (`#E9F5FF`, the exact fill of z/o/x.png) screen, one bird video (`loading-bird-ice.mp4`, the original black bird and motion on that Ice Blue — no blend modes or filters, edges feathered) flapping at the centre. After ~2 s (max 3 s) scroll unlocks and a small mouse-scroll icon fades in at the bottom; nothing else happens until the user scrolls, and the indicator fades out with the first 30 vh.

**02–06 — one pinned, scroll-scrubbed GSAP timeline** (490 vh, fully reversible, `TUNING.scroll`):

| Scroll (vh) | What happens |
| --- | --- |
| 0–140 | Bird video grows into the O while playing; its wingbeat speeds up with growth (1× → 3×). The background is a **square** centred on the O, covering the screen, that shrinks by uniform scale to the O's artwork square — 1:1 throughout, in lockstep with the bird |
| 120–230 | Z from the left + X from the right — ONE tween (same start, duration, ease, mirrored distance), starting while the O is still settling and arriving as it completes |
| 140–210 | Settle: video scroll-scrubbed to its last frame (= `o.png`'s bird pose) |
| 210–230 | `o.png` fades in over the pixel-aligned video bird |
| 220–280 | One INTERACTIVE AGENCY text element settles under the completed logo |
| 280–320 | Complete logo rests |
| 320–490 | Z / X shrink outward, the O grows into the reel frame, showreel fades up — ends exactly on `landing_showreel.jpeg`, borderless |

The showreel gets its poster and starts buffering at 55 % and decodes only while visible.

## Structure

| Path | Role |
| --- | --- |
| `src/config/brand.ts` | Asset paths, measured artwork geometry, timings |
| `src/lib/zorx/layout.ts` | Preloader / logo / showreel states for any viewport |
| `src/lib/zorx/timelines.ts` | `buildScrollExperience` — the single pinned, scrubbed timeline |
| `src/lib/zorx/media.ts` | `waitForEssentials` (≤ 2 s), `BirdController` (play / scrub / hold) |
| `src/components/zorx/*` | `ZorxExperience` (orchestrator), `Preloader`, `BirdAnimation`, `ZorxLogoReveal`, `ShowreelSection`; `src/components/ui/LoadingIndicator.tsx` |

## Assets

Originals are untouched. Optimised copies live in `public/videos/optimized/`:

| File | From | Size |
| --- | --- | --- |
| `loading-bird-ice.mp4` | `Loading.mp4` (1.04 MB) — black bird on Ice Blue, 720², keyframe every 2 frames for cheap scrubbing and fast playback. Background encoded at (229,243,254) so Chrome/Safari render exactly #E9F5FF | 268 KB |
| `showreel-1080.mp4` / `showreel-720.mp4` | `showreel.mp4` (4K, 80 MB, audio) | 19 MB / 9.4 MB, silent |
| `showreel-poster.jpg` | first frames of the reel | 10 KB |

Screens ≤ 900 px get the 720 reel; exactly one reel source is ever requested. The reel gets its poster and starts buffering only after the logo reveal, and plays only while it is on screen.

To replace the showreel, re-encode and overwrite the optimised files:

```bash
ffmpeg -i showreel.mp4 -an -vf scale=1920:-2 -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -movflags +faststart public/videos/optimized/showreel-1080.mp4
ffmpeg -i showreel.mp4 -an -vf scale=1280:-2 -c:v libx264 -crf 25 -preset medium -pix_fmt yuv420p -movflags +faststart public/videos/optimized/showreel-720.mp4
```

If `Loading.mp4` changes, regenerate `loading-bird-ice.mp4` (command in `src/config/brand.ts`) and re-measure the final-frame bird box (`GEOMETRY.loaderBird`) so it stays aligned with `o.png`.
# zorx_web
# zorx_web

## Services section (perching birds)

`src/components/services/` — four full-width rows (Branding, Website, Production, Marketing) set in **Outfit** (variable, via `next/font`; 500 outlined → 700 solid). Hover (mouse/pen) or tap highlights a row immediately; after the intent delay (`SERVICES_TUNING`: 0.75 s hover, 0.45 s tap) that row's bird flies in and perches on the divider below it. When the row is left (or tapped again) the bird **takes off and flies out** — a real exit clip, not a fade — and the title returns to outlined once it has gone. One controller owns the bird (idle → entering → perched → exiting); it only changes state when a flight has finished, so there is never more than one bird. Keyboard focus works like hover. Content and clips live in `src/config/services.ts`. **Website**: woodpecker, enters from and leaves to the right. **Production**: owl, enters from and leaves to the left (`side: "left"`). Branding and Marketing have no bird yet. Each bird has its own enter/exit `<video>` pair (fetched once, kept buffered).

Birds are pre-keyed offline — the browser never chroma-keys:

```bash
node scripts/process-bird-video.mjs --in public/videos/bird-videos/<source>.mp4 \
  --name <service> --start <s> --end <s> --crop W:H:X:Y --width 720 [--erase X:Y:W:H]
```

It keys the green, despills, removes the source's own perch line wherever it runs (the site's divider replaces it), erases an optional watermark box, optionally feathers the top edge (`--feather-top N`, for birds that fly out of the source frame), and writes to `public/videos/bird/`: `<name>.webm` (VP9 alpha — Chrome/Firefox/Edge), `<name>-hevc.mp4` (HEVC alpha — Safari/iOS) and `<name>.json` (perch line, feet, bounds). Point the service's `bird` entry at those files.

Each bird needs two clips processed with the **same crop**: an enter clip (`--rest last`) and an exit clip starting on the same perched pose (`--rest first`).

Current Website clips: source `bird-videos/branding.mp4`, crop `1240:1040:680:0`, watermark `1696:856:86:86` — enter 0.8–3.6 s (`website`), exit 6.792–9.0 s (`website-exit`, starts on the frame closest to the enter clip's resting pose).

Current Production clips: source `bird-videos/owl.mp4` (one take, split on the same perched frame), crop `1500:1080:0:0`, quality flags `--key linear --temporal --stabilize --crf 24 --hevc-q 65 --alpha-quality 0.95` — enter 0–4.417 s (`production`, `--rest last`), exit 4.417–7.0 s (`production-exit`, `--rest first --feather-top 90`). Rendered at `size: 1.3`.

Quality flags (opt-in; the Website clips use the original defaults): `--key linear` (alpha proportional to greenness + true colour recovery — keeps motion-blurred feathers, no tints or dark rims), `--temporal` (steadies alpha where the source is static — no shimmer at rest), `--stabilize` (pins the source perch line, so the bird lands on a rigid line like the site divider).
