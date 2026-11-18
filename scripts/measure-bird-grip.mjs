#!/usr/bin/env node
/**
 * Measures how a perched bird's toes cross the divider, frame by frame, for a
 * bird that stands IN FRONT of its own tail (the peacock): writes the grip data
 * the Services section uses to draw the divider over the train and behind the
 * toes (BirdGrip in src/config/services.ts).
 *
 *   node scripts/measure-bird-grip.mjs
 *
 * Reads the processed clips (public/videos/bird/branding-bird{,-exit}.webm —
 * decoded with alpha), writes public/videos/bird/branding-bird-grip.json.
 *
 * Toes are found structurally, not by colour alone: pale, low-saturation pixels
 * that belong to a connected foot (≥ 25 px tall, with ≥ 4 rows at least 6 px
 * wide above the line — tarsus and toe spread). The train's pale feather shafts
 * are long but never that wide, so they don't count. Where a toe crosses the
 * line's rows, the line is cut away (the line passes behind it).
 * Windows, checked frame by frame against the footage (see the Services README):
 *  - entrance: the line comes in front of the train as the bird starts its
 *    vertical descent onto its spot; toes are measured from the frame the
 *    claws first reach the line (earlier, only shafts are near it)
 *  - take-off: toes measured until the feet leave the line, then the line
 *    goes back behind the bird
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const W = 720, H = 866, FPS = 24;
const PERCH_Y = 523.5; // clip row on the divider: toes curl over it, claws hook below
const BAND = [521, 526]; // rows a 1px line can cover, down to phone scale (≈ 5 clip px)
const REGION = { x0: 250, x1: 470, y0: 430, y1: 550 };
const SPAN = [255, 492]; // where the train can hide the divider while the line is drawn
const ENTER = { fade: [46, 52], toesFrom: 79 }; // frames
const EXIT = { toesUntil: 29, fade: [30, 36] };

const decode = (file) =>
  new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-loglevel", "error", "-c:v", "libvpx-vp9", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgba", "-"]);
    const chunks = [];
    ff.stdout.on("data", (c) => chunks.push(c));
    ff.stderr.on("data", (d) => process.stderr.write(d));
    ff.on("close", (code) => (code ? reject(new Error(`decode failed: ${file}`)) : resolve(Buffer.concat(chunks))));
  });

function toes(buf, f) {
  const o = f * W * H * 4;
  const { x0, x1, y0, y1 } = REGION;
  const pale = new Set();
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = o + (y * W + x) * 4;
      const r = buf[i], g = buf[i + 1], b = buf[i + 2], a = buf[i + 3];
      if (a > 200 && 0.299 * r + 0.587 * g + 0.114 * b > 120 && Math.max(r, g, b) - Math.min(r, g, b) < 50) pale.add(y * W + x);
    }
  const seen = new Set();
  const gaps = [];
  for (const p of pale) {
    if (seen.has(p)) continue;
    const comp = [];
    const queue = [p];
    seen.add(p);
    while (queue.length) {
      const k = queue.pop();
      comp.push(k);
      const x = k % W, y = (k - x) / W;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const n = (y + dy) * W + x + dx;
          if (pale.has(n) && !seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
    }
    const rows = new Map();
    for (const k of comp) {
      const x = k % W, y = (k - x) / W;
      const r = rows.get(y) ?? [];
      r.push(x);
      rows.set(y, r);
    }
    const ys = [...rows.keys()];
    if (Math.max(...ys) - Math.min(...ys) < 25) continue;
    const wide = ys.filter((y) => y < BAND[0] - 3 && rows.get(y).length >= 6 && Math.max(...rows.get(y)) - Math.min(...rows.get(y)) >= 6);
    if (wide.length < 4) continue;
    const cols = [...new Set(comp.filter((k) => Math.floor(k / W) >= BAND[0] && Math.floor(k / W) <= BAND[1]).map((k) => k % W))].sort((a, b) => a - b);
    const iv = [];
    for (const x of cols) {
      if (iv.length && x - iv.at(-1)[1] <= 2) iv.at(-1)[1] = x;
      else iv.push([x, x]);
    }
    for (const [a, b] of iv) if (b - a >= 2) gaps.push([a - 0.5, b + 1.5]);
  }
  gaps.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [a, b] of gaps) {
    if (merged.length && a - merged.at(-1)[1] <= 1.5) merged.at(-1)[1] = Math.max(merged.at(-1)[1], b);
    else merged.push([a, b]);
  }
  return merged;
}

const enter = await decode("public/videos/bird/branding-bird.webm");
const exit = await decode("public/videos/bird/branding-bird-exit.webm");
const nE = enter.length / (W * H * 4), nX = exit.length / (W * H * 4);
const enterGaps = Array.from({ length: nE }, (_, f) => (f >= ENTER.toesFrom ? toes(enter, f) : []));
const exitGaps = Array.from({ length: nX }, (_, f) => (f <= EXIT.toesUntil ? toes(exit, f) : []));

const data = {
  fps: FPS,
  perchY: PERCH_Y,
  span: SPAN,
  enter: { fade: ENTER.fade, gaps: enterGaps },
  exit: { fade: EXIT.fade, gaps: exitGaps },
};
writeFileSync("public/videos/bird/branding-bird-grip.json", JSON.stringify(data) + "\n");
console.log(`enter ${nE} frames, exit ${nX} frames; toe crossings measured on ${enterGaps.filter((g) => g.length).length} + ${exitGaps.filter((g) => g.length).length} frames`);
