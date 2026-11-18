#!/usr/bin/env node
/**
 * Client logo → the carousel's style: WHITE artwork on a transparent ground,
 * trimmed to the artwork's bounds + 2 px, lossless WebP (public/clients/*.webp,
 * like the logos cut from the sheet). The source file is only read, never changed.
 *
 *   node scripts/make-client-logo.mjs --in assets-src/clients/x.png --out public/clients/x.webp \
 *        --height 60 [--mode alpha|warm] [--warm 12:60] [--fill-outlines x0:y0:x1:y1]
 *
 *   --mode alpha  the source already has transparency: every visible pixel turns
 *                 white, its alpha (anti-aliasing included) is kept
 *   --mode warm   a gold / warm logo on a white (or light) ground: coverage is
 *                 the pixel's warmth (red − blue), mapped from `lo` (nothing) to
 *                 `hi` (solid) — white paper and neutral silver / grey parts read
 *                 as no ink (they become knockouts), the gold as solid white
 *   --fill-outlines  a box (source px) holding white letters that are drawn only
 *                 by a thin grey outline (white text made for dark grounds):
 *                 regions enclosed an odd number of times are letter fill and
 *                 turn white; even ones (the inside of an O) stay transparent.
 *                 --close n (default 1) first seals gaps of up to 2n px in the outlines;
 *                 --outline v (default 243): the lightest grey that counts as outline
 *   --height      the artwork's height in the output (px, before the 2 px margin) —
 *                 the carousel draws every logo at one shared scale of its pixels
 *
 * Prints the output's width × height for src/config/clients.ts.
 */
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

const sharp = createRequire(import.meta.url)("sharp");
const { values: o } = parseArgs({
  options: {
    in: { type: "string" },
    out: { type: "string" },
    height: { type: "string", default: "60" },
    mode: { type: "string", default: "alpha" },
    warm: { type: "string", default: "12:60" },
    "fill-outlines": { type: "string" },
    close: { type: "string", default: "1" },
    outline: { type: "string", default: "243" },
  },
});
if (!o.in || !o.out) throw new Error("--in and --out are required");

const { data, info } = await sharp(o.in).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const cover = new Uint8Array(N); // 0–255: how much of the pixel is logo

// ------------------------------------------------------------------ coverage
const [lo, hi] = o.warm.split(":").map(Number);
for (let p = 0; p < N; p++) {
  const r = data[4 * p], b = data[4 * p + 2], a = data[4 * p + 3];
  if (o.mode === "alpha") cover[p] = a;
  else cover[p] = Math.round(Math.max(0, Math.min(1, (r - b - lo) / (hi - lo))) * 255 * (a / 255));
}

// ------------------------------------------------------------------ outlined white letters
if (o["fill-outlines"]) {
  const [bx0, by0, bx1, by1] = o["fill-outlines"].split(":").map(Number);
  const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
  const at = (x, y) => (by0 + y) * W + bx0 + x;
  // outline = a neutral grey pixel no lighter than --outline (0–255; JPEG
  // noise in the white is lighter, and lone specks are dropped below)
  const outlineMax = Number(o.outline);
  const line = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const p = at(x, y), r = data[4 * p], g = data[4 * p + 1], b = data[4 * p + 2];
      line[y * bw + x] = r - b <= 8 && Math.min(r, g, b) <= outlineMax ? 1 : 0;
    }
  // drop specks (outline blobs under 6 px)
  const blob = new Int32Array(bw * bh).fill(-1);
  for (let s = 0; s < bw * bh; s++) {
    if (!line[s] || blob[s] >= 0) continue;
    const stack = [s], seen = [];
    blob[s] = s;
    while (stack.length) {
      const q = stack.pop(); seen.push(q);
      const x = q % bw, y = (q / bw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy, n = ny * bw + nx;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || !line[n] || blob[n] >= 0) continue;
        blob[n] = s; stack.push(n);
      }
    }
    if (seen.length < 6) for (const q of seen) line[q] = 0;
  }
  // close the outlines' 1–2 px gaps (anti-aliasing / compression), without
  // thickening them: dilate, then erode, by `close` px
  const morph = (src, grow) => {
    const dst = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        let hit = !grow;
        for (let dy = -closeR; dy <= closeR && hit !== grow; dy++)
          for (let dx = -closeR; dx <= closeR; dx++) {
            const nx = x + dx, ny = y + dy;
            const v = nx < 0 || ny < 0 || nx >= bw || ny >= bh ? 0 : src[ny * bw + nx];
            if (grow ? v : !v) { hit = grow; break; }
          }
        dst[y * bw + x] = hit ? 1 : 0;
      }
    return dst;
  };
  const closeR = Number(o.close);
  // `orig` keeps the drawn outlines (for counting how many a crossing passes);
  // `line` (closed) only decides what is connected, so nothing leaks through a gap
  const orig = line.slice();
  if (closeR > 0) line.set(morph(morph(line, true), false));
  // regions between the outlines (4-connected)
  const comp = new Int32Array(bw * bh).fill(-1);
  let nComp = 0;
  const border = new Set();
  for (let s = 0; s < bw * bh; s++) {
    if (line[s] || comp[s] >= 0) continue;
    const id = nComp++, stack = [s];
    comp[s] = id;
    while (stack.length) {
      const q = stack.pop(), x = q % bw, y = (q / bw) | 0;
      if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) border.add(id);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * bw + nx;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || line[n] || comp[n] >= 0) continue;
        comp[n] = id; stack.push(n);
      }
    }
  }
  // Neighbouring regions across a stroke (rows and columns): each crossing votes
  // on whether it passes an odd or even number of drawn outlines (an O's ring —
  // outer + inner outline — is two: its inside is background again).
  const votes = new Map(); // "a,b" → [even, odd]
  const scan = (len, get) => {
    let prev = -1, run = 0, lines = 0, inLine = false;
    for (let i = 0; i < len; i++) {
      const s = get(i);
      if (line[s]) {
        run++;
        if (orig[s] && !inLine) lines++;
        inLine = !!orig[s];
        continue;
      }
      const c = comp[s];
      if (prev >= 0 && run > 0 && run <= 14 && c !== prev && lines > 0) {
        const key = prev < c ? `${prev},${c}` : `${c},${prev}`;
        const v = votes.get(key) ?? [0, 0];
        v[lines % 2]++;
        votes.set(key, v);
      }
      prev = c; run = 0; lines = 0; inLine = false;
    }
  };
  for (let y = 0; y < bh; y++) scan(bw, (i) => y * bw + i);
  for (let x = 0; x < bw; x++) scan(bh, (i) => i * bw + x);
  const adj = Array.from({ length: nComp }, () => []);
  for (const [key, [even, odd]] of votes) {
    const [a, b] = key.split(",").map(Number), par = odd > even ? 1 : 0;
    adj[a].push([b, par]);
    adj[b].push([a, par]);
  }
  // parity from the outside: 1 = inside a letter (its fill), 0 = background (incl. counters)
  const parity = new Int8Array(nComp).fill(-1);
  const queue = [...border];
  for (const c of queue) parity[c] = 0;
  for (let k = 0; k < queue.length; k++)
    for (const [n, par] of adj[queue[k]]) if (parity[n] < 0) { parity[n] = parity[queue[k]] ^ par; queue.push(n); }
  let filled = 0, counters = 0;
  for (let c = 0; c < nComp; c++) if (!border.has(c) && parity[c] === 0) counters++;
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const s = y * bw + x;
      if (line[s] || parity[comp[s]] === 1) { cover[at(x, y)] = 255; filled++; }
    }
  console.log(`outlined letters: ${nComp} regions (${counters} counters kept open), ${filled} px filled`);
}

// ------------------------------------------------------------------ trim, scale, margin, write
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (cover[y * W + x] > 3) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const rgba = Buffer.alloc(N * 4, 255);
for (let p = 0; p < N; p++) rgba[4 * p + 3] = cover[p];
const target = Number(o.height);
const out = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .resize({ height: target, kernel: "lanczos3" })
  .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .webp({ lossless: true, exact: true })
  .toFile(o.out);
console.log(`${o.out}: ${out.width} × ${out.height} (artwork ${x1 - x0 + 1} × ${y1 - y0 + 1} source px → height ${target})`);
