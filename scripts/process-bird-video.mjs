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
 *   Optional: a pale perch wire at known rows (--line-band), a seamless
 *   dissolve loop (--loop-xfade) and a still poster (--poster).
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
 *   Contact section — three Blue Manakins on a pale wire, looping courtship:
 *   node scripts/process-bird-video.mjs --in public/videos/bird-videos/bird-dancing-video.mp4 \
 *     --name manakins --out public/videos/contact --end 7 --crop 1720:926:132:26 --width 960 \
 *     --key linear --screen-d 95 --temporal --line-y 847 --line-band 838:856 \
 *     --erase 1696:856:86:86,132:806:334:146,1760:806:92:146 --loop-xfade 14 --loop-slots 796,1130 --loop-dissolve 6 \
 *     --rest first --poster
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
const [CW, SRC_CH, CX, CY] = args.crop.split(":").map(Number); // crop in source px
const CH = SRC_CH + Number(args["pad-bottom"] ?? 0); // working canvas height (crop + bottom pad)
const CUT_Y = SRC_CH - 1; // last row that came from the source
const OUT_W = Number(args.width ?? 720);
const OUT_DIR = args.out ?? "public/videos/bird";
// x:y:w:h in source px; several boxes separated by commas
const ERASE = args.erase ? args.erase.split(",").map((box) => box.split(":").map(Number)) : null;
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
//   --key protect  as linear, plus protection for birds with green plumage (peacock):
//                  green pixels deep inside the silhouette are kept exactly as filmed,
//                  and recovered edge colours near them may stay green
const KEY = args.key === "linear" || args.key === "protect" ? args.key : "dominance";
const FEATHER_BOTTOM = Number(args["feather-bottom"] ?? 0);
// --feather-right N  soft fade over the last N crop columns — for a bird whose wing
//                    or tail runs into the source frame's right edge, so it fades
//                    instead of being cut by a straight edge
const FEATHER_RIGHT = Number(args["feather-right"] ?? 0);
const MAX_SHIFT = Number(args["max-shift"] ?? 25);
const TEMPORAL = "temporal" in args;
const STABILIZE = "stabilize" in args;
// --stabilize release: follow the line only until the bird pushes off (the line's
// last press before it snaps back), then hold — so the flying bird doesn't bob
// with the springing line.
const STAB_RELEASE = args.stabilize === "release";
// --pad-bottom N   extend the canvas N px below the source frame (keyed transparent),
//                  for birds whose tail is cut by the source's bottom edge
// --tail-ref T     rebuild that cut tail tip from the frame at T s (a frame of the same
//                  take where the whole tail is in shot) — see rebuildTail()
// --tail-feather N frames whose cut tail can't be rebuilt (fast, swinging tail) fade
//                  out over the last N source rows instead of ending on a hard edge
const PAD_BOTTOM = Number(args["pad-bottom"] ?? 0);
const TAIL_REF = args["tail-ref"] != null ? Number(args["tail-ref"]) : null;
const TAIL_FEATHER = Number(args["tail-feather"] ?? 40);
// --line-green     colour-aware line removal (for birds with no green at the line): in
//                  the band, green-dominant pixels are line (its ends fade out through
//                  dark green, which the protect key would keep as plumage), saturated
//                  pixels are bird crossing it; fill is premultiplied
const LINE_GREEN = "line-green" in args;
// --line-band Y0:Y1  a light (pale) perch wire at known rows, in source px — the
//                    dark-line detector can't see it. In the band, green-tinted
//                    pixels are wire or backdrop (removed; rebuilt across, premultiplied,
//                    where the bird is on both sides — feet gripping it, a tail hanging
//                    through it); clearly non-green, solid pixels are bird (claws).
const LINE_BAND = args["line-band"] ? args["line-band"].split(":").map((v) => Number(v) - CY) : null;
// --loop-xfade N     seamless loop for footage whose last pose doesn't match its
//                    first: the clip starts at frame N and its last N frames dissolve
//                    (premultiplied) into source frames 0…N-1, which lead into frame N.
const LOOP_XFADE = Number(args["loop-xfade"] ?? 0);
// --poster           also write NAME-poster.webp: the first output frame, with alpha
//                    (shown before the clip loads and with reduced motion)
const POSTER = "poster" in args;
// --loop-slots X1,X2,…  with --loop-xfade: birds sitting side by side (source px
//                    boundaries between them) dissolve one after another, each over
//                    --loop-dissolve frames (default 6), so each reads as a quick head
//                    turn of its own instead of one slow, synchronised ghost
const LOOP_SLOTS = args["loop-slots"] ? args["loop-slots"].split(",").map((v) => Number(v) - CX) : [];
const LOOP_DISSOLVE = Number(args["loop-dissolve"] ?? 6);
// --screen-d D       linear / protect keys: backdrop samples are pixels at least this
//                    green-dominant (g − max(r, b)). Default 150 suits a saturated
//                    screen; a paler one (≈ 115) needs lower, or no sample is found.
const SCREEN_D = Number(args["screen-d"] ?? 150);
// --line-y Y       footage with no perch line (the bird lands in mid-air): the perch
//                  height in source px — where the feet grip — used as the line for
//                  placement; nothing is detected or removed
const FIXED_LINE = args["line-y"] != null ? Number(args["line-y"]) - CY : null;
// --protect-still  with --key protect: only green that holds still between frames is
//                  protected (a bird with a little green that flies fast)
const PROTECT_STILL = "protect-still" in args;
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
// The bottom pad is filled with the source's own backdrop green, so it keys out
// exactly like the rest of the screen.
const PAD_COLOR = args["pad-color"] ?? "0x19E622";
const decode = (ss, t, into, extra = []) =>
  new Promise((resolve, reject) => {
    const vf = `fps=${FPS},crop=${CW}:${SRC_CH}:${CX}:${CY}` + (PAD_BOTTOM ? `,pad=${CW}:${CH}:0:0:color=${PAD_COLOR}` : "");
    const ff = spawn("ffmpeg", [
      "-loglevel", "error", "-ss", String(ss), ...(t ? ["-t", String(t)] : []), "-i", IN,
      "-vf", vf, ...extra, "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]);
    let buf = Buffer.alloc(0);
    ff.stdout.on("data", (c) => {
      buf = Buffer.concat([buf, c]);
      while (buf.length >= FRAME) {
        into.push(Buffer.from(buf.subarray(0, FRAME)));
        buf = buf.subarray(FRAME);
      }
    });
    ff.stderr.on("data", (d) => process.stderr.write(d));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg decode failed"))));
  });
await decode(START, END - START, frames);
// --speedup A:B:K  play source time [A, B) K× faster (keep every K-th frame) — for an
// idle stretch inside a continuous take, e.g. a head turn before take-off.
if (args.speedup) {
  const [a, b, k] = args.speedup.split(":").map(Number);
  let j = 0;
  const kept = frames.filter((_, f) => {
    const t = START + f / FPS;
    return t < a - 1e-6 || t >= b - 1e-6 || j++ % k === 0;
  });
  console.log(`speedup ${a}–${b} s ×${k}: ${frames.length} → ${kept.length} frames`);
  frames.splice(0, frames.length, ...kept);
}
console.log(`decoded ${frames.length} frames ${CW}×${SRC_CH}${PAD_BOTTOM ? ` (+${PAD_BOTTOM} px transparent below)` : ""}`);

// ---------------------------------------------------------------- key
const isDark = (r, g, b) => r < 80 && g < 80 && b < 80;

let lastLine = null; // line centre in the previous frame (tracking)

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
  const candidates = groups.filter((g) => g.length >= 3);
  if (!candidates.length) return null;
  // Track the line through time: it only moves a little between frames, so pick
  // the candidate nearest the previous frame's line (dark plumage bands can form
  // long runs too). First frame: the densest cluster.
  const mid = (g) => (g[0] + g[g.length - 1]) / 2;
  let line;
  if (lastLine == null) {
    line = candidates.reduce((best, g) => (g.length > best.length || (g.length === best.length && g[0] > best[0]) ? g : best));
  } else {
    line = candidates.reduce((best, g) => (Math.abs(mid(g) - lastLine) < Math.abs(mid(best) - lastLine) ? g : best));
    if (Math.abs(mid(line) - lastLine) > 40) return null; // nothing plausible this frame
  }
  lastLine = mid(line);
  // Margin rows: the line's soft anti-aliased edges are part of it too
  // (wider with the linear key, which keeps faint dark-green edges semi-opaque).
  const pad = args["line-pad"] ? Number(args["line-pad"]) : KEY === "dominance" ? 5 : 8;
  return { top: line[0] - pad, bottom: line[line.length - 1] + pad, centre: (line[0] + line[line.length - 1]) / 2 };
}

let out = Buffer.alloc(frames.length * CW * CH * 4);
const meta = [];

let prevRgb = null;
let prevProt = null; // protected-plumage map of the previous frame (--protect-still)
let prevAlpha = null;
const shifts = [];
frames.forEach((rgb, f) => {
  const o = f * CW * CH * 4;
  if (KEY === "linear" || KEY === "protect") {
    // Key colour for this frame: median of clearly-background pixels.
    const rs = [], gs = [], bs = [];
    for (let p = 0; p < CW * CH * 3; p += 3 * 997) {
      const d = rgb[p + 1] - Math.max(rgb[p], rgb[p + 2]);
      if (d > SCREEN_D) { rs.push(rgb[p]); gs.push(rgb[p + 1]); bs.push(rgb[p + 2]); }
    }
    if (rs.length < 20 && f === 0) console.warn(`warning: only ${rs.length} backdrop samples — lower --screen-d`);
    const med = (a) => (a.sort((x, y) => x - y), a[a.length >> 1] ?? 0);
    const G = [med(rs), med(gs), med(bs)];
    const dG = G[1] - Math.max(G[0], G[2]);
    const D0 = 12, D1 = dG - 14; // ≤ D0 opaque · ≥ D1 transparent · linear between
    // Green-plumage protection maps (integral images → O(1) box queries).
    let prot = null, zone = null;
    if (KEY === "protect") {
      const R = 6, R2 = 5, n = CW * CH;
      const notFg = new Uint8Array(n), green = new Uint8Array(n);
      for (let k = 0, p = 0; k < n; k++, p += 3) {
        const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
        notFg[k] = Math.hypot(r - G[0], g - G[1], b - G[2]) <= 20 ? 1 : 0;
        // Real plumage green: clearly green-dominant and not near-black (a black
        // source line is "green-dominant" by a hair and must not be protected).
        // Also well away from the key colour: fine gaps (crest fan, between wing
        // feathers) are mostly-backdrop mixtures that sit close to the key.
        green[k] =
          g - Math.max(r, b) > 20 &&
          0.299 * r + 0.587 * g + 0.114 * b > 40 &&
          Math.hypot(r - G[0], g - G[1], b - G[2]) > 55
            ? 1
            : 0;
      }
      const integral = (src) => {
        const I = new Int32Array((CW + 1) * (CH + 1));
        for (let y = 0; y < CH; y++) {
          let row = 0;
          for (let x = 0; x < CW; x++) {
            row += src[y * CW + x];
            I[(y + 1) * (CW + 1) + x + 1] = I[y * (CW + 1) + x + 1] + row;
          }
        }
        return I;
      };
      const box = (I, x, y, r) => {
        const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(CW, x + r + 1), y1 = Math.min(CH, y + r + 1);
        return I[y1 * (CW + 1) + x1] - I[y0 * (CW + 1) + x1] - I[y1 * (CW + 1) + x0] + I[y0 * (CW + 1) + x0];
      };
      if (PROTECT_STILL) {
        // Only plumage that holds still counts as green feathers: a fast wing or tail
        // smears yellow over the screen into "green" mixtures that must be keyed.
        // Hysteresis keeps a turning head's green protected while it moves.
        const cmp = f > 0 ? frames[f - 1] : frames[1] ?? rgb;
        for (let k = 0, p = 0; k < n; k++, p += 3) {
          if (!green[k]) continue;
          const diff = Math.abs(rgb[p] - cmp[p]) + Math.abs(rgb[p + 1] - cmp[p + 1]) + Math.abs(rgb[p + 2] - cmp[p + 2]);
          if (!(diff < 30 || (prevProt && prevProt[k] && diff < 80))) green[k] = 0;
        }
      }
      const Inot = integral(notFg);
      prot = new Uint8Array(n);
      for (let y = 0; y < CH; y++)
        for (let x = 0; x < CW; x++) {
          const k = y * CW + x;
          if (green[k] && !notFg[k] && box(Inot, x, y, R) === 0) prot[k] = 1; // deep inside → feather
        }
      prevProt = prot;
      const Ip = integral(prot);
      zone = new Uint8Array(n);
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (box(Ip, x, y, R2) > 0) zone[y * CW + x] = 1;
    }
    for (let p = 0, q = o, k = 0; p < CW * CH * 3; p += 3, q += 4, k++) {
      const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
      const d = g - Math.max(r, b);
      let a = d <= D0 ? 1 : d >= D1 ? 0 : (D1 - d) / (D1 - D0);
      const inZone = zone && zone[k];
      if (prot && prot[k]) {
        // Natural green plumage, deep inside the bird: keep exactly as filmed.
        out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = 255;
        continue;
      }
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
      if (!inZone) {
        // Non-green subjects / non-green parts: no green cast, no magenta cast.
        if (fg > hi + (a < 0.95 ? 1 : 6)) fg = hi + (a < 0.95 ? 1 : 6);
        if (fg < lo) fg = lo;
      }
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
  const band = LINE_BAND
    ? { top: LINE_BAND[0], bottom: LINE_BAND[1], centre: (LINE_BAND[0] + LINE_BAND[1]) / 2, light: true }
    : FIXED_LINE != null
      ? null
      : lineBand(rgb);
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
        const t = (y - yA) / (yB - yA);
        if (band.light) {
          const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
          if (g - Math.max(r, b) < 35 && out[q + 3] >= 200) continue; // bird crossing the wire
          const aa = out[ia + 3] * (1 - t), ab = out[ib + 3] * t, na = aa + ab;
          if (out[ia + 3] < 128 || out[ib + 3] < 128 || na < 1) { out[q] = out[q + 1] = out[q + 2] = 130; out[q + 3] = 0; continue; }
          for (let c = 0; c < 3; c++) out[q + c] = Math.round((out[ia + c] * aa + out[ib + c] * ab) / na);
          out[q + 3] = Math.round(na);
          continue;
        }
        if (LINE_GREEN) {
          // Colour-aware: the line is neutral black fading out through dark green;
          // a saturated (blue / yellow) or bright solid pixel is bird crossing it.
          const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
          const greenish = g - Math.max(r, b) > 12; // dark line greens lead by 13–30; brown tail ≤ 6
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          // Line = near-black and neutral (max < 85, chroma < 28) or dark green; the
          // macaw's dark brown / blue tail is just warmer or more saturated than that.
          const lineLike = greenish || (Math.max(r, g, b) < 85 && sat < 28);
          if (!lineLike && out[q + 3] >= 200) continue;
          // Line pixel. Bird on both sides (feet gripping it, a tail hanging through
          // it): rebuild across, premultiplied so edges don't turn grey. Otherwise it
          // is backdrop behind the line — a fill from one side would smear the bird.
          const aa = out[ia + 3] * (1 - t), ab = out[ib + 3] * t, na = aa + ab;
          if (out[ia + 3] < 128 || out[ib + 3] < 128 || na < 1) { out[q] = out[q + 1] = out[q + 2] = 130; out[q + 3] = 0; continue; }
          for (let c = 0; c < 3; c++) out[q + c] = Math.round((out[ia + c] * aa + out[ib + c] * ab) / na);
          out[q + 3] = Math.round(na);
          continue;
        }
        if (lum >= 90 && out[q + 3] >= (KEY === "dominance" ? 200 : 230)) continue;
        for (let c = 0; c < 4; c++) out[q + c] = Math.round(out[ia + c] * (1 - t) + out[ib + c] * t);
      }
    }
  }
  // 3. watermark box
  if (ERASE) {
    for (const [ex, ey, ew, eh] of ERASE)
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
  if (FEATHER_RIGHT > 0) {
    for (let y = 0; y < CH; y++)
      for (let x = Math.max(0, CW - FEATHER_RIGHT); x < CW; x++) {
        const k = (CW - 1 - x) / FEATHER_RIGHT;
        const q = o + (y * CW + x) * 4 + 3;
        out[q] = Math.round(out[q] * k * k * (3 - 2 * k));
      }
  }
  if (FEATHER_BOTTOM > 0) {
    for (let y = Math.max(0, CH - FEATHER_BOTTOM); y < CH; y++) {
      const k = (CH - 1 - y) / FEATHER_BOTTOM;
      for (let x = 0; x < CW; x++) {
        const q = o + (y * CW + x) * 4 + 3;
        out[q] = Math.round(out[q] * k * k * (3 - 2 * k));
      }
    }
  }
  meta.push({ f, line: FIXED_LINE ?? band?.centre ?? null });
});

// 4b. rebuild a tail tip cut off by the source's bottom edge
if (TAIL_REF != null && PAD_BOTTOM > 0) await rebuildTail();

/**
 * The source frame's bottom edge cuts the resting bird's tail. Another frame of
 * the same take (`--tail-ref`) shows the whole tail, but in a different pose
 * (shorter, curved). So its real tip is borrowed:
 *  - one fixed tip profile for the whole clip (no per-frame flicker): the
 *    reference rows below the row whose width equals the cut width, stretched
 *    vertically by the measured taper ratio (resting tail ÷ reference tail)
 *  - per frame it only follows the tail: centre, tilt and width at the cut,
 *    lightly smoothed over neighbouring frames
 *  - the reference tail's curve is straightened (each row re-centred)
 * Frames where the tail is swinging too fast to match get a soft fade instead.
 */
async function rebuildTail() {
  const refRgb = [];
  await decode(TAIL_REF, 0, refRgb, ["-frames:v", "1"]);
  const ref = keySimple(refRgb[0]);
  const A = (buf, o, x, y) => buf[o + (y * CW + x) * 4 + 3];
  /** Widest opaque run on a row (gaps ≤ 2 px bridged). */
  const run = (buf, o, y) => {
    let best = { w: 0, c: 0 }, s = -1, gap = 0, e = -1;
    const close = () => {
      if (s >= 0 && e - s + 1 > best.w) best = { w: e - s + 1, c: (s + e) / 2 };
      s = -1;
    };
    for (let x = 0; x < CW; x++) {
      if (A(buf, o, x, y) > 128) { if (s < 0) s = x; e = x; gap = 0; }
      else if (s >= 0 && ++gap > 2) close();
    }
    close();
    return best;
  };
  // Reference tail profile, from well above the cut down to its tip.
  const refRows = new Map();
  let refTip = -1;
  for (let y = CUT_Y - 220; y < CH; y++) {
    const r = run(ref, 0, y);
    refRows.set(y, r);
    if (r.w >= 2) refTip = y;
  }
  if (refTip < 0 || refTip >= CUT_Y - 2) {
    console.warn("tail-ref: reference tail is not complete in shot — skipped");
    return;
  }

  // Per frame: tail at the cut (width, centre, tilt) and its taper rate just above it.
  const S = CW * CH * 4;
  // The source's last rows are slightly less saturated (encoder edge), which keys
  // to a faint haze; now that the canvas continues below, it would show as a seam.
  for (let f = 0; f < frames.length; f++)
    for (let y = CUT_Y - 5; y <= CUT_Y; y++)
      for (let x = 0; x < CW; x++) { const q = f * S + (y * CW + x) * 4 + 3; if (out[q] < 48) out[q] = 0; }
  const info = frames.map((_, f) => {
    const o = f * S;
    const b = run(out, o, CUT_Y);
    if (!b.w) return null;
    const up = run(out, o, CUT_Y - 30);
    const slope = up.w && Math.abs(b.c - up.c) < 30 ? (b.c - up.c) / 30 : 0;
    const up40 = run(out, o, CUT_Y - 40);
    return { ...b, slope, rate: up40.w ? (up40.w - b.w) / 40 : 0, ok: false };
  });
  const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
  // The resting tail hangs through the edge for a long unbroken stretch; a tail
  // swinging through it during landing touches it only briefly. Rebuild only the
  // longest consecutive run of edge-touching frames; any shorter run is faded.
  let best = [0, -1];
  for (let f = 0; f < info.length; ) {
    if (!info[f]) { f++; continue; }
    let e = f;
    while (e + 1 < info.length && info[e + 1]) e++;
    if (e - f > best[1] - best[0]) best = [f, e];
    f = e + 1;
  }
  for (let f = best[0]; f <= best[1]; f++) if (info[f]) info[f].ok = true;
  const good = info.filter((i) => i?.ok);
  if (!good.length) { console.log("tail-ref: no frame needs a rebuilt tail"); return; }
  const Wm = med(good.map((i) => i.w));
  const rateCur = Math.max(0, med(good.map((i) => i.rate)));
  // Where to graft: the reference row (in its lower tail) whose local taper best
  // matches the resting tail's taper at the cut — the borrowed tip then continues
  // the tail's own narrowing instead of pinching in. Scaled uniformly (width and
  // length together) so the cut widths agree.
  const wRef = (y) => refRows.get(Math.max(CUT_Y - 220, Math.min(refTip, y)))?.w ?? 0;
  let M = null, bestErr = Infinity;
  for (let y = refTip - 90; y <= refTip - 12; y++) {
    if (wRef(y) < 8) continue;
    const err = Math.abs((wRef(y - 10) - wRef(y + 10)) / 20 - rateCur) + (0.5 * Math.abs(wRef(y) - Wm)) / Wm;
    if (err < bestErr - 1e-6) { bestErr = err; M = y; }
  }
  if (M == null) { console.warn("tail-ref: no usable reference row — skipped"); return; }
  const refWM = wRef(M);
  const K = Math.max(0.8, Math.min(2.2, Wm / refWM));
  const tipLen = Math.round((refTip - M) * K);
  // Colour match: reference rows just above M vs each frame's rows just above the cut.
  const meanRGB = (buf, o, y0, y1) => {
    const s = [0, 0, 0]; let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < CW; x++) {
      const q = o + (y * CW + x) * 4;
      if (buf[q + 3] > 200) { s[0] += buf[q]; s[1] += buf[q + 1]; s[2] += buf[q + 2]; n++; }
    }
    return n ? s.map((v) => v / n) : null;
  };
  const refC = meanRGB(ref, 0, M - 6, M);
  const gains = good.map((_, j) => j).filter((j) => j % 4 === 0).map((j) => {
    const f = info.indexOf(good[j]);
    const c = meanRGB(out, f * S, CUT_Y - 6, CUT_Y);
    return c ? c.map((v, i) => v / Math.max(1, refC[i])) : [1, 1, 1];
  });
  // --tail-gain r/g/b pins it, so an enter and an exit clip use the identical tip.
  const gain = args["tail-gain"]
    ? args["tail-gain"].split("/").map(Number)
    : [0, 1, 2].map((i) => Math.max(0.8, Math.min(1.25, med(gains.map((g) => g[i])))));
  console.log(
    `tail-ref: frames ${best[0]}–${best[1]} rebuilt, cut width ${Wm}px, taper ${rateCur.toFixed(2)}px/row → reference row ${M} (${refWM}px), ×${K.toFixed(2)}, ` +
      `tip +${tipLen}px below the source edge, gain ${gain.map((g) => g.toFixed(2)).join("/")}`,
  );
  if (tipLen + 1 > PAD_BOTTOM) console.warn(`tail-ref: --pad-bottom ${PAD_BOTTOM} is shorter than the tip (${tipLen})`);

  // Smooth centre / tilt / width over neighbouring rebuilt frames (±2).
  const smooth = (f, key) => {
    let s = 0, n = 0;
    for (let d = -2; d <= 2; d++) { const i = info[f + d]; if (i?.ok) { s += i[key]; n++; } }
    return s / n;
  };
  const refCentre = (y) => {
    const y0 = Math.floor(y), t = y - y0;
    const a = refRows.get(y0), b = refRows.get(Math.min(refTip, y0 + 1));
    return a.c * (1 - t) + b.c * t;
  };
  let feathered = 0;
  info.forEach((it, f) => {
    if (!it) return;
    const o = f * S;
    if (!it.ok) {
      // Swinging tail: soft fade into the source edge instead of a hard cut.
      feathered++;
      for (let y = Math.max(0, CUT_Y - TAIL_FEATHER + 1); y <= CUT_Y; y++) {
        const k = (CUT_Y - y + 1) / TAIL_FEATHER, e = k * k * (3 - 2 * k);
        for (let x = 0; x < CW; x++) { const q = o + (y * CW + x) * 4 + 3; out[q] = Math.round(out[q] * e); }
      }
      return;
    }
    // Centre straight from this frame (so the tip stays on its own tail as it
    // sways); tilt and width lightly smoothed.
    const c = it.c, slope = smooth(f, "slope"), w = smooth(f, "w");
    const BLEND = 6; // rows over which the frame's own last row hands over to the tip
    const last = Buffer.from(out.subarray(o + CUT_Y * CW * 4, o + (CUT_Y + 1) * CW * 4));
    const sw = w / refWM;
    const half = Math.ceil((refWM * sw) / 2) + 8;
    for (let dy = 1; dy <= tipLen && CUT_Y + dy < CH; dy++) {
      const yr = M + dy / K;
      const ry0 = Math.floor(yr), ry1 = Math.min(refTip, ry0 + 1), ty = yr - ry0;
      const rc = refCentre(yr);
      const cx = c + slope * dy;
      const y = CUT_Y + dy;
      for (let x = Math.max(0, Math.floor(cx - half)); x <= Math.min(CW - 1, Math.ceil(cx + half)); x++) {
        const xr = rc + (x - cx) / sw;
        const rx0 = Math.floor(xr), tx = xr - rx0;
        if (rx0 < 0 || rx0 + 1 >= CW) continue;
        // Bilinear, alpha-weighted (premultiplied) sample of the reference.
        let pa = 0, pr = 0, pg = 0, pb = 0;
        for (const [sx, sy, wgt] of [[rx0, ry0, (1 - tx) * (1 - ty)], [rx0 + 1, ry0, tx * (1 - ty)], [rx0, ry1, (1 - tx) * ty], [rx0 + 1, ry1, tx * ty]]) {
          const q = (sy * CW + sx) * 4, a = (ref[q + 3] / 255) * wgt;
          pa += a; pr += ref[q] * a; pg += ref[q + 1] * a; pb += ref[q + 2] * a;
        }
        const q = o + (y * CW + x) * 4;
        let R = pa > 0.02 ? Math.min(255, (pr / pa) * gain[0]) : 130;
        let Gc = pa > 0.02 ? Math.min(255, (pg / pa) * gain[1]) : 130;
        let B = pa > 0.02 ? Math.min(255, (pb / pa) * gain[2]) : 130;
        let al = pa;
        if (dy <= BLEND) {
          // Seam: start from the frame's own last source row (carried along the
          // tilt) and cross-fade into the borrowed tip.
          const lx = Math.round(x - slope * dy);
          if (lx >= 0 && lx < CW) {
            const l = lx * 4, la = last[l + 3] / 255, t = dy / (BLEND + 1), e = t * t * (3 - 2 * t);
            const na = la * (1 - e) + al * e;
            if (na > 0.004) {
              R = (last[l] * la * (1 - e) + R * al * e) / na;
              Gc = (last[l + 1] * la * (1 - e) + Gc * al * e) / na;
              B = (last[l + 2] * la * (1 - e) + B * al * e) / na;
            }
            al = na;
          }
        }
        if (al < 0.02) continue;
        out[q] = Math.round(R); out[q + 1] = Math.round(Gc); out[q + 2] = Math.round(B);
        out[q + 3] = Math.round(al * 255);
      }
    }
  });
  if (feathered) console.log(`tail-ref: ${feathered} fast-swinging frames faded into the edge instead`);
}

/** Plain linear key + colour recovery (used for reference frames). */
function keySimple(rgb) {
  const rs = [], gs = [], bs = [];
  for (let p = 0; p < CW * CH * 3; p += 3 * 997) {
    const d = rgb[p + 1] - Math.max(rgb[p], rgb[p + 2]);
    if (d > 150) { rs.push(rgb[p]); gs.push(rgb[p + 1]); bs.push(rgb[p + 2]); }
  }
  const md = (a) => (a.sort((x, y) => x - y), a[a.length >> 1] ?? 0);
  const G = [md(rs), md(gs), md(bs)];
  const D0 = 12, D1 = G[1] - Math.max(G[0], G[2]) - 14;
  const o = Buffer.alloc(CW * CH * 4);
  for (let p = 0, q = 0; p < CW * CH * 3; p += 3, q += 4) {
    const r = rgb[p], g = rgb[p + 1], b = rgb[p + 2];
    const d = g - Math.max(r, b);
    const a = d <= D0 ? 1 : d >= D1 ? 0 : (D1 - d) / (D1 - D0);
    if (a < 0.04) { o[q] = o[q + 1] = o[q + 2] = 130; continue; }
    let fr = (r - (1 - a) * G[0]) / a, fg = (g - (1 - a) * G[1]) / a, fb = (b - (1 - a) * G[2]) / a;
    fr = Math.max(0, Math.min(255, fr)); fb = Math.max(0, Math.min(255, fb));
    fg = Math.max(Math.min(fr, fb), Math.min(Math.max(fr, fb) + 6, Math.max(0, Math.min(255, fg))));
    o[q] = fr; o[q + 1] = fg; o[q + 2] = fb; o[q + 3] = Math.round(a * 255);
  }
  return o;
}

// 5. stabilise: shift every frame so the source line sits at the resting height
if (STABILIZE) {
  const restIdx = REST === "first" ? 0 : frames.length - 1;
  const target = meta[restIdx].line;
  if (process.env.DEBUG_LINES) console.log("raw line centres", meta.map((m) => m.line).join(" "));
  if (target != null) {
    const row = CW * 4;
    let release = Infinity;
    if (STAB_RELEASE) {
      for (let f = 1; f + 3 < meta.length; f++) {
        const a = meta[f].line, b = meta[f + 3].line;
        if (a != null && b != null && a - b > 8) { release = f; break; }
      }
      if (release !== Infinity) console.log(`stabilise: following the line until frame ${release} (push-off), then holding`);
    }
    const heldLine = release !== Infinity ? meta[release].line : null;
    meta.forEach((m, f) => {
      if (f > release) m.line = heldLine;
      if (m.line == null) return;
      const dy = Math.round(target - m.line);
      if (!dy || Math.abs(dy) > MAX_SHIFT) return; // real bounce is small; anything larger is not the line
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

// 6. seamless loop: frames N… with the last N dissolving into frames 0…N-1
if (LOOP_XFADE > 0) {
  const N = LOOP_XFADE, T = frames.length, L = T - N, FS = CW * CH * 4;
  const looped = Buffer.alloc(L * FS);
  // Dissolve weight per column: one slot (the whole frame) over all N frames, or
  // staggered slots of LOOP_DISSOLVE frames each, the last finishing on frame N-1.
  const S = LOOP_SLOTS.length + 1;
  const D = S > 1 ? Math.min(LOOP_DISSOLVE, N) : N + 2;
  const slotOf = (x) => LOOP_SLOTS.filter((b) => x >= b).length;
  const weight = (slot, k) => {
    const off = S > 1 ? Math.round((slot * (N - D)) / (S - 1)) : -1;
    const u = Math.min(1, Math.max(0, (k - off) / (D - 1)));
    return u * u * (3 - 2 * u);
  };
  for (let i = 0; i < L; i++) {
    const s = N + i, k = s - (T - N); // k ≥ 0: inside the dissolve
    const so = s * FS, lo = i * FS;
    if (k < 0) { out.copy(looped, lo, so, so + FS); continue; }
    const bo = k * FS;
    // per-column weight, eased across each slot boundary (±12 px, in the gap between birds)
    const wx = new Float32Array(CW);
    for (let x = 0; x < CW; x++) {
      let w = weight(slotOf(x), k);
      for (const b of LOOP_SLOTS) {
        if (Math.abs(x - b) < 12) {
          const t = (x - b + 12) / 24;
          w = weight(slotOf(b - 1), k) * (1 - t) + weight(slotOf(b), k) * t;
        }
      }
      wx[x] = w;
    }
    for (let q = 0; q < FS; q += 4) {
      const w = wx[(q >> 2) % CW];
      const aA = out[so + q + 3] * (1 - w), aB = out[bo + q + 3] * w, a = aA + aB;
      if (a < 0.5) { looped[lo + q] = looped[lo + q + 1] = looped[lo + q + 2] = 130; looped[lo + q + 3] = 0; continue; }
      for (let c = 0; c < 3; c++) looped[lo + q + c] = Math.round((out[so + q + c] * aA + out[bo + q + c] * aB) / a);
      looped[lo + q + 3] = Math.round(a);
    }
  }
  out = looped;
  frames.length = L;
  meta.splice(0, N);
  console.log(
    `loop: frames ${N}–${T - 1}, last ${N} dissolve into 0–${N - 1}` +
      (S > 1 ? ` (${S} slots × ${D} frames, staggered)` : "") +
      ` → ${L} frames (${(L / FPS).toFixed(2)} s)`,
  );
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
if (POSTER) {
  const sharp = (await import("sharp")).default;
  await sharp(out.subarray(0, CW * CH * 4), { raw: { width: CW, height: CH, channels: 4 } })
    .resize(OUT_W, OUT_H)
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(join(OUT_DIR, `${NAME}-poster.webp`));
  console.log(`wrote ${OUT_DIR}/${NAME}-poster.webp`);
}
const { unlinkSync } = await import("node:fs");
if (!process.env.KEEP_RAW) unlinkSync(raw);
console.log(`wrote ${OUT_DIR}/${NAME}.webm, ${NAME}-hevc.mp4, ${NAME}.json`);
