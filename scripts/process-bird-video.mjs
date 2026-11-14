#!/usr/bin/env node
/**
 * ZORX green-screen bird processor (offline asset preprocessing).
 *
 * Turns a green-screen bird clip into transparent web video, so the browser
 * never keys anything at runtime:
 *   1. ffmpeg decodes the chosen segment + crop as raw RGB frames
 *   2. green-dominance key with despill (soft, motion-blur friendly edges)
 *   3. removes the source's own perch line (the site's divider replaces it):
 *      over open green it vanishes; where it crosses the bird it is rebuilt
 *      from the pixels directly above and below
 *   4. erases a fixed watermark box, if given
 *   5. encodes VP9-alpha WebM (Chrome/Firefox/Edge) and HEVC-alpha MP4
 *      (Safari/iOS), and writes placement metadata (perch line, feet, bounds)
 *
 * Requires ffmpeg with libvpx-vp9 and hevc_videotoolbox (macOS).
 *
 * Usage:
 *   node scripts/process-bird-video.mjs --in public/videos/bird-videos/branding.mp4 \
 *     --name website --start 0.8 --end 3.6 --crop 1200:920:720:120 --width 720 \
 *     --erase 1696:856:86:86
 *   Exit (take-off) clip, same crop so both share one coordinate system:
 *   node scripts/process-bird-video.mjs --in … --name website-exit --start 6.792 --end 9 \
 *     --crop 1240:980:680:60 --width 720 --erase 1696:856:86:86 --rest first
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce(
    (acc, v, i, a) =>
      v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : "1"]] : acc,
    [],
  ),
);
const IN = args.in;
const NAME = args.name;
const START = Number(args.start ?? 0);
const END = Number(args.end);
const [CW, CH, CX, CY] = args.crop.split(":").map(Number); // crop in source px
const OUT_W = Number(args.width ?? 720);
const OUT_DIR = args.out ?? "public/videos/bird";
const ERASE = args.erase ? args.erase.split(":").map(Number) : null; // x:y:w:h in source px
const FPS = Number(args.fps ?? 24);
// Which frame is the resting (perched) pose: "last" for an entrance clip,
// "first" for an exit clip that takes off from the perch.
const REST = args.rest === "first" ? "first" : "last";
// Soft fade (px, crop rows) at the top edge — for birds that leave through the
// top of the source frame, so they fade out instead of being cut by a hard edge.
const FEATHER_TOP = Number(args["feather-top"] ?? 0);
// Opt-in quality modes (the defaults reproduce the original Website clips exactly):
//   --key linear   alpha ∝ greenness + true foreground colour recovery
//                  F = (C − (1−a)·G) / a — keeps motion-blurred feathers and
//                  avoids clamp-despill tints; transparent pixels get neutral grey
//   --temporal     alpha averaged with the previous frame where the source pixel is
//                  static — removes compression shimmer on a resting bird
//   --stabilize    shift each frame so the source perch line stays at the resting
//                  height — the bird lands on a rigid line, like the site divider
const KEY = args.key === "linear" ? "linear" : "dominance";
const TEMPORAL = "temporal" in args;
const STABILIZE = "stabilize" in args;
const CRF = Number(args.crf ?? 32);
const HEVC_Q = Number(args["hevc-q"] ?? 55);
const ALPHA_Q = Number(args["alpha-quality"] ?? 0.85);

// Key thresholds on d = g − max(r, b). Green screen ≈ 200, bird pixels ≤ ~20.
const KEY_LO = 20; // d ≤ LO → fully opaque
const KEY_HI = 90; // d ≥ HI → fully transparent

if (!IN || !NAME || !END || !args.crop) {
  console.error("Missing --in, --name, --end or --crop");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const FRAME = CW * CH * 3;
const frames = [];

// ---------------------------------------------------------------- decode
await new Promise((resolve, reject) => {
  const ff = spawn("ffmpeg", [
    "-loglevel", "error", "-ss", String(START), "-t", String(END - START), "-i", IN,
    "-vf", `fps=${FPS},crop=${CW}:${CH}:${CX}:${CY}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
  ]);
  let buf = Buffer.alloc(0);
  ff.stdout.on("data", (c) => {
    buf = Buffer.concat([buf, c]);
    while (buf.length >= FRAME) {
      frames.push(Buffer.from(buf.subarray(0, FRAME)));
      buf = buf.subarray(FRAME);
    }
  });
  ff.stderr.on("data", (d) => process.stderr.write(d));
  ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg decode failed"))));
});
console.log(`decoded ${frames.length} frames ${CW}×${CH}`);

// ---------------------------------------------------------------- key
const isDark = (r, g, b) => r < 80 && g < 80 && b < 80;

/** Detect the source perch line: rows containing a long dark horizontal run (anywhere). */
function lineBand(rgb) {
  const rows = [];
  for (let y = 0; y < CH; y++) {
    let run = 0, best = 0;
    for (let x = 0; x < CW; x++) {
      const i = (y * CW + x) * 3;
      if (isDark(rgb[i], rgb[i + 1], rgb[i + 2])) { run++; if (run > best) best = run; }
      else run = 0;
    }
    if (best > 250) rows.push(y);
  }
  if (!rows.length) return null;
  // The line is a tight cluster of consecutive rows; isolated long dark runs
  // elsewhere (e.g. dark feather bars in flight) must not merge into it.
  const groups = [];
  for (const y of rows) {
    const g = groups[groups.length - 1];
    if (g && y - g[g.length - 1] <= 3) g.push(y);
    else groups.push([y]);
  }
  const line = groups.reduce((best, g) => (g.length > best.length || (g.length === best.length && g[0] > best[0]) ? g : best));
  if (line.length < 3) return null;
  // Margin rows: the line's soft anti-aliased edges are part of it too
  // (wider with the linear key, which keeps faint dark-green edges semi-opaque).
  const pad = KEY === "linear" ? 8 : 5;
  return { top: line[0] - pad, bottom: line[line.length - 1] + pad, centre: (line[0] + line[line.length - 1]) / 2 };
}

const out = Buffer.alloc(frames.length * CW * CH * 4);
const meta = [];

let prevRgb = null;
let prevAlpha = null;
const shifts = [];
frames.forEach((rgb, f) => {
  const o = f * CW * CH * 4;
  if (KEY === "linear") {
    // Key colour for this frame: median of clearly-background pixels.
    const rs = [], gs = [], bs = [];
    for (let p = 0; p < CW * CH * 3; p += 3 * 997) {
      const d = rgb[p + 1] - Math.max(rgb[p], rgb[p + 2]);
      if (d > 150) { rs.push(rgb[p]); gs.push(rgb[p + 1]); bs.push(rgb[p + 2]); }
    }
    const med = (a) => (a.sort((x, y) => x - y), a[a.length >> 1] ?? 0);
    const G = [med(rs), med(gs), med(bs)];
    const dG = G[1] - Math.max(G[0], G[2]);
    const D0 = 12, D1 = dG - 14; // ≤ D0 opaque · ≥ D1 transparent · linear between
    for (let p = 0, q = o, k = 0; p < CW * CH * 3; p += 3, q += 4, k++) {
      const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
      const d = g - Math.max(r, b);
      let a = d <= D0 ? 1 : d >= D1 ? 0 : (D1 - d) / (D1 - D0);
      if (TEMPORAL && prevRgb && prevAlpha) {
        const still = Math.abs(r - prevRgb[p]) + Math.abs(g - prevRgb[p + 1]) + Math.abs(b - prevRgb[p + 2]) < 18;
        if (still) a = 0.5 * a + 0.5 * (prevAlpha[k] / 255);
      }
      if (a < 0.04) a = 0;
      if (a === 0) {
        out[q] = 130; out[q + 1] = 130; out[q + 2] = 130; out[q + 3] = 0; // neutral, no bleed
        continue;
      }
      // Recover the true foreground colour from the green mix.
      let fr = (r - (1 - a) * G[0]) / a, fg = (g - (1 - a) * G[1]) / a, fb = (b - (1 - a) * G[2]) / a;
      fr = Math.max(0, Math.min(255, fr)); fg = Math.max(0, Math.min(255, fg)); fb = Math.max(0, Math.min(255, fb));
      // Keep green between red and blue: no residual spill (green cast) and no
      // over-subtraction (magenta cast). Neutral greys, yellow eyes and pink feet
      // all satisfy this naturally.
      const lo = Math.min(fr, fb), hi = Math.max(fr, fb);
      if (fg > hi + (a < 0.95 ? 1 : 6)) fg = hi + (a < 0.95 ? 1 : 6);
      if (fg < lo) fg = lo;
      out[q] = fr; out[q + 1] = fg; out[q + 2] = fb; out[q + 3] = Math.round(a * 255);
    }
    if (TEMPORAL) {
      prevRgb = rgb;
      prevAlpha = new Uint8Array(CW * CH);
      for (let k = 0; k < CW * CH; k++) prevAlpha[k] = out[o + k * 4 + 3];
    }
  } else {
    // 1. green-dominance key + despill (original Website recipe)
    for (let p = 0, q = o; p < CW * CH * 3; p += 3, q += 4) {
      let r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
      const d = g - Math.max(r, b);
      let a = d <= KEY_LO ? 1 : d >= KEY_HI ? 0 : (KEY_HI - d) / (KEY_HI - KEY_LO);
      if (g > Math.max(r, b)) g = Math.max(r, b); // despill
      if (a < 0.04) a = 0;
      out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = Math.round(a * 255);
    }
  }
  // 2. remove the source perch line
  const band = lineBand(rgb);
  if (band) {
    const yA = Math.max(0, band.top - 2);
    const yB = Math.min(CH - 1, band.bottom + 2);
    for (let x = 0; x < CW; x++) {
      const ia = o + (yA * CW + x) * 4;
      const ib = o + (yB * CW + x) * 4;
      for (let y = band.top; y <= band.bottom; y++) {
        const p = (y * CW + x) * 3;
        const q = o + (y * CW + x) * 4;
        // Keep only clearly bird pixels (bright and solid, e.g. claws); anything
        // dark or semi-transparent in the band is line or line edge.
        const lum = 0.299 * rgb[p] + 0.587 * rgb[p + 1] + 0.114 * rgb[p + 2];
        if (lum >= 90 && out[q + 3] >= (KEY === "linear" ? 230 : 200)) continue;
        const t = (y - yA) / (yB - yA);
        for (let c = 0; c < 4; c++) out[q + c] = Math.round(out[ia + c] * (1 - t) + out[ib + c] * t);
      }
    }
  }
  // 3. watermark box
  if (ERASE) {
    const [ex, ey, ew, eh] = ERASE;
    for (let y = Math.max(0, ey - CY); y < Math.min(CH, ey - CY + eh); y++)
      for (let x = Math.max(0, ex - CX); x < Math.min(CW, ex - CX + ew); x++) out[o + (y * CW + x) * 4 + 3] = 0;
  }
  // 4. top feather
  if (FEATHER_TOP > 0) {
    for (let y = 0; y < Math.min(FEATHER_TOP, CH); y++) {
      const k = y / FEATHER_TOP;
      for (let x = 0; x < CW; x++) {
        const q = o + (y * CW + x) * 4 + 3;
        out[q] = Math.round(out[q] * k * k * (3 - 2 * k));
      }
    }
  }
  meta.push({ f, line: band?.centre ?? null });
});

// 5. stabilise: shift every frame so the source line sits at the resting height
if (STABILIZE) {
  const restIdx = REST === "first" ? 0 : frames.length - 1;
  const target = meta[restIdx].line;
  if (process.env.DEBUG_LINES) console.log("raw line centres", meta.map((m) => m.line).join(" "));
  if (target != null) {
    const row = CW * 4;
    meta.forEach((m, f) => {
      if (m.line == null) return;
      const dy = Math.round(target - m.line);
      if (!dy || Math.abs(dy) > 25) return; // real bounce is small; anything larger is not the line
      const o = f * CW * CH * 4;
      const copy = Buffer.from(out.subarray(o, o + CW * CH * 4));
      for (let y = 0; y < CH; y++) {
        const sy = y - dy;
        if (sy >= 0 && sy < CH) copy.copy(out, o + y * row, sy * row, (sy + 1) * row);
        else for (let x = 0; x < CW; x++) { const q = o + y * row + x * 4; out[q] = 130; out[q + 1] = 130; out[q + 2] = 130; out[q + 3] = 0; }
      }
      m.line = target;
      shifts.push(dy);
    });
    console.log(`stabilised: max shift ${Math.max(0, ...shifts.map(Math.abs))} px over ${shifts.length} frames`);
  }
}

// ---------------------------------------------------------------- placement metadata (resting pose)
const last = REST === "first" ? 0 : frames.length - 1;
const lo = last * CW * CH * 4;
// Bounds from row/column projections (≥ 4 solid px), so stray specks don't count.
const colN = new Array(CW).fill(0), rowN = new Array(CH).fill(0);
for (let y = 0; y < CH; y++)
  for (let x = 0; x < CW; x++)
    if (out[lo + (y * CW + x) * 4 + 3] > 128) { colN[x]++; rowN[y]++; }
const bx0 = colN.findIndex((n) => n >= 4), bx1 = CW - 1 - [...colN].reverse().findIndex((n) => n >= 4);
const by0 = rowN.findIndex((n) => n >= 4), by1 = CH - 1 - [...rowN].reverse().findIndex((n) => n >= 4);
const restLine =
  meta[last].line ?? (REST === "first" ? meta.find((m) => m.line != null) : meta.filter((m) => m.line != null).at(-1))?.line;
// Feet: opaque pixels within ±12 px of the perch line.
let fx0 = CW, fx1 = -1;
for (let y = Math.round(restLine - 12); y <= Math.round(restLine + 12); y++)
  for (let x = 0; x < CW; x++)
    if (out[lo + (y * CW + x) * 4 + 3] > 128) { if (x < fx0) fx0 = x; if (x > fx1) fx1 = x; }
// Part of the resting bird that hangs below the perch line (tail / feet) —
// placement keeps it clear of the next row's text.
let tx0 = CW, tx1 = -1;
for (let y = Math.round(restLine + 6); y < CH; y++)
  for (let x = 0; x < CW; x++)
    if (out[lo + (y * CW + x) * 4 + 3] > 128) { if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; }
// Highest point the bird reaches during the whole clip (for row clearance).
let flightTop = CH;
for (let f = 0; f < frames.length; f++) {
  const fo = f * CW * CH * 4;
  for (let y = 0; y < flightTop; y++) {
    let n = 0;
    for (let x = 0; x < CW; x++) if (out[fo + (y * CW + x) * 4 + 3] > 128) n++;
    if (n >= 4) { flightTop = y; break; }
  }
}

const s = OUT_W / CW;
const OUT_H = Math.round((CH * s) / 2) * 2;
const r1 = (v) => Math.round(v * s * 10) / 10;
const placement = {
  width: OUT_W,
  height: OUT_H,
  duration: Math.round((frames.length / FPS) * 1000) / 1000,
  lineY: r1(restLine), // perch line at rest — align with the site divider
  bird: { x0: r1(bx0), x1: r1(bx1), y0: r1(by0), y1: r1(by1) }, // resting bounds
  feetX: r1((fx0 + fx1) / 2),
  tail: tx1 >= 0 ? { x0: r1(tx0), x1: r1(tx1) } : null, // below-line bounds at rest
  flightTop: r1(flightTop),
};
console.log("placement", JSON.stringify(placement));

// ---------------------------------------------------------------- encode
const raw = join(OUT_DIR, `.${NAME}.rgba`);
writeFileSync(raw, out);
const enc = (argv) =>
  new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${CW}x${CH}`, "-r", String(FPS), "-i", raw, ...argv]);
    ff.stderr.on("data", (d) => process.stderr.write(d));
    ff.on("close", (c) => (c === 0 ? resolve() : reject(new Error("encode failed"))));
  });
const scale = `scale=${OUT_W}:${OUT_H}:flags=lanczos`;
await enc(["-vf", `${scale},format=yuva420p`, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", String(CRF), "-row-mt", "1", "-deadline", "good", "-auto-alt-ref", "0", "-an", join(OUT_DIR, `${NAME}.webm`)]);
await enc(["-vf", `${scale},format=bgra`, "-c:v", "hevc_videotoolbox", "-alpha_quality", String(ALPHA_Q), "-q:v", String(HEVC_Q), "-tag:v", "hvc1", "-an", "-movflags", "+faststart", join(OUT_DIR, `${NAME}-hevc.mp4`)]);
writeFileSync(join(OUT_DIR, `${NAME}.json`), JSON.stringify(placement, null, 2) + "\n");
const { unlinkSync } = await import("node:fs");
unlinkSync(raw);
console.log(`wrote ${OUT_DIR}/${NAME}.webm, ${NAME}-hevc.mp4, ${NAME}.json`);
