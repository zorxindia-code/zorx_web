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
  process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []),
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

/** Detect the source perch line: dark rows whose dark run reaches the right edge. */
function lineBand(rgb) {
  const rows = [];
  for (let y = 0; y < CH; y++) {
    let run = 0;
    for (let x = CW - 1; x >= 0; x--) {
      const i = (y * CW + x) * 3;
      if (isDark(rgb[i], rgb[i + 1], rgb[i + 2])) run++;
      else break;
    }
    if (run > 250) rows.push(y);
  }
  if (!rows.length) return null;
  // ±5 rows: the line's soft anti-aliased edges are part of it too.
  return { top: rows[0] - 5, bottom: rows[rows.length - 1] + 5, centre: (rows[0] + rows[rows.length - 1]) / 2 };
}

const out = Buffer.alloc(frames.length * CW * CH * 4);
const meta = [];

frames.forEach((rgb, f) => {
  const o = f * CW * CH * 4;
  // 1. green-dominance key + despill
  for (let p = 0, q = o; p < CW * CH * 3; p += 3, q += 4) {
    let r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
    const d = g - Math.max(r, b);
    let a = d <= KEY_LO ? 1 : d >= KEY_HI ? 0 : (KEY_HI - d) / (KEY_HI - KEY_LO);
    if (g > Math.max(r, b)) g = Math.max(r, b); // despill
    if (a < 0.04) a = 0;
    out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = Math.round(a * 255);
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
        if (lum >= 90 && out[q + 3] >= 200) continue;
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
  meta.push({ f, line: band?.centre ?? null });
});

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
await enc(["-vf", `${scale},format=yuva420p`, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "32", "-row-mt", "1", "-deadline", "good", "-auto-alt-ref", "0", "-an", join(OUT_DIR, `${NAME}.webm`)]);
await enc(["-vf", `${scale},format=bgra`, "-c:v", "hevc_videotoolbox", "-alpha_quality", "0.85", "-q:v", "55", "-tag:v", "hvc1", "-an", "-movflags", "+faststart", join(OUT_DIR, `${NAME}-hevc.mp4`)]);
writeFileSync(join(OUT_DIR, `${NAME}.json`), JSON.stringify(placement, null, 2) + "\n");
const { unlinkSync } = await import("node:fs");
unlinkSync(raw);
console.log(`wrote ${OUT_DIR}/${NAME}.webm, ${NAME}-hevc.mp4, ${NAME}.json`);
