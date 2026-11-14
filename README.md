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

**01 — Loading (automatic, ~2 s).** Ice Blue (`#E9F5FF`, the exact fill of z/o/x.png) screen, one bird video (`loading-bird-ice.mp4`, the original black bird and motion on that Ice Blue — no blend modes or filters, edges feathered) flapping at the centre. After ~2 s (max 3 s) scroll unlocks and a small *SCROLL TO EXPLORE* mouse indicator fades in at the bottom; nothing else happens until the user scrolls, and the indicator fades out with the first 30 vh.

**02–06 — one pinned, scroll-scrubbed GSAP timeline** (570 vh, fully reversible, `TUNING.scroll`):

| Scroll (vh) | % | What happens |
| --- | --- | --- |
| 0–140 | 0–25 | Bird video grows into the O while playing; its wingbeat speeds up with growth (1× → 3×, `TUNING.flap`); the Ice Blue background contracts to the O square in lockstep |
| 140–210 | 25–37 | Settle: video scroll-scrubbed to its last frame (= `o.png`'s bird pose) |
| 210–230 | 37–40 | `o.png` fades in over the pixel-aligned video bird  |
| 230–340 | 40–60 | Z from the left + X from the right — ONE tween: same start, duration, ease, mirrored distance |
| 300–360 | 53–63 | One INTERACTIVE AGENCY text element settles |
| 360–400 | 63–70 | Complete logo rests |
| 400–570 | 70–100 | Z / X shrink outward, the O grows into the reel frame, showreel fades up — ends exactly on `landing_showreel.jpeg`; a 2 px Ice Blue stroke frames the viewport (video inset 2 px, never under the stroke) |

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
