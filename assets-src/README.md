# Source assets (not deployed)

Originals kept out of `public/`, so they are never served or shipped with the site:

| Path | What | Used to produce |
| --- | --- | --- |
| `videos/bird-videos/*.mp4` | Green-screen bird footage (originals) | `public/videos/bird/*`, `public/videos/contact/*` via `scripts/process-bird-video.mjs` |
| `videos/Loading.mp4` | Original intro bird | `public/videos/optimized/loading-bird-ice.mp4` |
| `videos/showreel.mp4` | 4K showreel master (80 MB, gitignored) | `public/videos/optimized/showreel-{720,1080}.mp4` |
| `icons/zorx-clients.png` | Client logo sheet | `public/clients/*.webp` (cut from the sheet) |
| `clients/*.png` | Client logos supplied in their own colours (originals, untouched) | `public/clients/halima-trading.webp`, `stepvision.webp` via `scripts/make-client-logo.mjs` (commands in `src/config/clients.ts`) |
| `screens/*` | Design reference screenshots | — |
| `fonts/Outfit/static/*` | Static Outfit cuts (the site uses the variable font) | — |
