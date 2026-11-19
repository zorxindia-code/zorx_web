#!/usr/bin/env node
/**
 * Performance budgets for the production build (run after `npm run build`):
 *
 *   npm run check:budgets
 *
 * Reads the prerendered homepage (.next/server/app/index.html) and measures
 * what a first visit downloads: the JavaScript and CSS it references (gzip -9,
 * as served), the fonts those stylesheets load, and the media marked
 * preload="auto". Also checks every deployed video and the size of public/.
 * No dependencies. Exits 1 if a budget is exceeded.
 *
 * Budgets are set from measured values (docs/ai-context/RESPONSIVE_AND_PERFORMANCE_AUDIT.md,
 * 2026-11-19) with a little headroom — tighten them as the site improves, and
 * raise one only deliberately.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024, MB = 1024 * 1024;
const BUDGETS = {
  initialJsGzip: 300 * KB, // measured 275 KB (framework ≈ 190, GSAP 53, site code 30)
  initialCssGzip: 20 * KB, // measured 10.5 KB
  fontsTotal: 80 * KB, // all referenced subsets, measured 65.2 KB (downloaded on this page: Outfit 44.9 + Jost latin 10.5)
  firstScreenMedia: 320 * KB, // measured 262 KB (the loader bird clip)
  perServiceClip: 3.5 * MB, // largest: branding-bird.webm 2.1 MB (HEVC v2 2.1 MB)
  showreelSmall: 10 * MB, // showreel-720.mp4 9.0 MB
  showreelLarge: 20 * MB, // showreel-1080.mp4 18.4 MB
  publicTotal: 60 * MB, // measured 54 MB
};

const root = process.cwd();
const html = join(root, ".next/server/app/index.html");
if (!existsSync(html)) {
  console.error("No build found: run `npm run build` first.");
  process.exit(1);
}
const page = readFileSync(html, "utf8");
const staticFile = (url) => join(root, ".next", url.replace(/^\/_next/, ""));
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const uniq = (a) => [...new Set(a)];

const js = uniq(page.match(/\/_next\/static\/chunks\/[^"']+\.js/g) ?? []);
const css = uniq(page.match(/\/_next\/static\/chunks\/[^"']+\.css/g) ?? []);
const jsGzip = js.reduce((s, u) => s + gz(staticFile(u)), 0);
const cssGzip = css.reduce((s, u) => s + gz(staticFile(u)), 0);
// fonts referenced by the stylesheets (relative "../media/…" URLs) — every subset
// counted, an upper bound: the browser fetches only those whose unicode-range is used
const fonts = uniq(css.flatMap((u) => (readFileSync(staticFile(u), "utf8").match(/\.\.\/media\/[^)"']+\.woff2/g) ?? []).map((m) => `/_next/static/media/${m.slice(9)}`)));
const fontBytes = fonts.reduce((s, u) => s + statSync(staticFile(u)).size, 0);
const eager = uniq([...page.matchAll(/<video[^>]*preload="auto"[^>]*>/g)].flatMap((m) => m[0].match(/src="([^"]+)"/)?.[1] ?? []));
const eagerBytes = eager.reduce((s, u) => s + statSync(join(root, "public", u)).size, 0);

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const pub = walk(join(root, "public"));
const publicBytes = pub.reduce((s, f) => s + statSync(f).size, 0);
const videos = pub.filter((f) => [".mp4", ".webm"].includes(extname(f)));
const size = (f) => statSync(f).size;
const birdMax = Math.max(...videos.filter((f) => /\/videos\/bird\//.test(f)).map(size));
const reel = (name) => size(videos.find((f) => f.endsWith(name)));

const rows = [
  ["Initial JavaScript (gzip)", jsGzip, BUDGETS.initialJsGzip, `${js.length} chunks`],
  ["Initial CSS (gzip)", cssGzip, BUDGETS.initialCssGzip, `${css.length} files`],
  ["Fonts referenced (WOFF2, all subsets)", fontBytes, BUDGETS.fontsTotal, `${fonts.length} files`],
  ["First-screen media (preload=auto)", eagerBytes, BUDGETS.firstScreenMedia, eager.join(", ")],
  ["Largest service bird clip", birdMax, BUDGETS.perServiceClip, ""],
  ["Showreel 720p", reel("showreel-720.mp4"), BUDGETS.showreelSmall, ""],
  ["Showreel 1080p", reel("showreel-1080.mp4"), BUDGETS.showreelLarge, ""],
  ["public/ total", publicBytes, BUDGETS.publicTotal, `${pub.length} files`],
];
const fmt = (b) => (b >= MB ? `${(b / MB).toFixed(1)} MB` : `${(b / KB).toFixed(1)} KB`);
let failed = 0;
for (const [label, value, budget, note] of rows) {
  const ok = value <= budget;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(34)} ${fmt(value).padStart(9)} / ${fmt(budget).padEnd(9)} ${note}`);
}
if (failed) {
  console.error(`\n${failed} budget(s) exceeded.`);
  process.exit(1);
}
console.log("\nAll budgets met.");
