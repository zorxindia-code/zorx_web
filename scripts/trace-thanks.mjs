#!/usr/bin/env node
/**
 * Traces the THANKS footer artwork and measures its composition, from the two
 * supplied reference screenshots (no original vector artwork exists yet):
 *
 *   node scripts/trace-thanks.mjs
 *
 * Reads   scripts/reference/thanks-initial.png  (1252 × 476 — the designed, resting-in-the-air state)
 *         scripts/reference/thanks-landed.png   (932 × 353  — the intended landed state, = initial × 0.75)
 * Writes  src/lib/footer/thanksScene.ts          (GENERATED: letter outlines, convex collision parts,
 *                                                  icon / label positions, landing targets)
 *
 * All output is in the initial image's pixel units (the scene's coordinate
 * system), so the drawn letters and their collision geometry are one and the
 * same shape at every size.
 *
 * Letters: the outlines are 1 px white strokes; four language labels cover
 * parts of them. Labels are removed and the hidden stroke segments rebuilt by
 * continuing the visible straight edges (collinear pairs joined; corners at the
 * intersection of their edges; open ends capped on the letters' common top
 * line). Then the outside is flood-filled, each letter becomes a solid mask →
 * marching-squares contour → Ramer–Douglas–Peucker → polygon (the A keeps its
 * counter as a hole). Each polygon is triangulated (ear clipping, holes
 * bridged) and merged into convex parts (Hertel–Mehlhorn) for Matter.js.
 *
 * Replace the reference with the original SVG export when it exists — the
 * component only needs the same outline paths and convex parts.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const load = async (p) => {
  const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, at: (x, y) => [data[(y * info.width + x) * 3], data[(y * info.width + x) * 3 + 1], data[(y * info.width + x) * 3 + 2]] };
};

const PALETTE = { green: [50, 234, 112], ice: [233, 246, 255], red: [243, 56, 55], blue: [71, 129, 255] };
const paletteOf = ([r, g, b]) => {
  if (Math.max(r, g, b) - Math.min(r, g, b) <= 8) return null; // white / grey / black
  let best = null, bd = Infinity;
  for (const [k, c] of Object.entries(PALETTE)) {
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return bd <= 3500 ? best : null;
};

/** Connected same-colour components (≥ minN px): centre, bbox, principal angle. */
function objects(img, minN = 250) {
  const { W, H, at } = img;
  const lab = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = paletteOf(at(x, y)); if (k) lab.set(y * W + x, k); }
  const seen = new Set(), out = [];
  for (const [p, k] of lab) {
    if (seen.has(p)) continue;
    const st = [p], pts = [];
    seen.add(p);
    while (st.length) {
      const q = st.pop(); pts.push(q);
      const x = q % W;
      for (const n of [q + 1, q - 1, q + W, q - W]) {
        const nx = n % W;
        if (Math.abs(nx - x) > 1) continue;
        if (lab.get(n) === k && !seen.has(n)) { seen.add(n); st.push(n); }
      }
    }
    if (pts.length < minN) continue;
    let cx = 0, cy = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (const q of pts) { const x = q % W, y = (q - x) / W; cx += x; cy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    cx /= pts.length; cy /= pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const q of pts) { const dx = (q % W) - cx, dy = (q - (q % W)) / W - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const angle = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
    out.push({ colour: k, cx, cy, n: pts.length, angle, x0, x1, y0, y1 });
  }
  return out.sort((a, b) => a.cx - b.cx);
}

// ------------------------------------------------------------------ composition
const A = await load("scripts/reference/thanks-initial.png");
const B = await load("scripts/reference/thanks-landed.png");
const W = A.W, H = A.H;
// landed image → initial image: x1 = (x2 + 8.25) / 0.75, y1 = (y2 + 0.7) / 0.75 (matched on the letters)
const toA = (x, y) => [(x + 8.25) / 0.75, (y + 0.7) / 0.75];

const objA = objects(A), objB = objects(B);
const big = (o) => o.n > 2000; // icon discs and labels (not the glyph pieces inside icons)
const icons = objA.filter((o) => big(o) && o.cy < 200);
const labels = objA.filter((o) => big(o) && o.cy >= 200);
const ICON_ORDER = ["whatsapp", "linkedin", "instagram", "x", "facebook"];
// the ice-blue greeting (designed as "Danke!") is the Chinese one now: same slot, same colour
const LABEL_ORDER = ["gracias", "nanni", "shukran", "xiexie"];
if (icons.length !== 5 || labels.length !== 4) throw new Error(`found ${icons.length} icons / ${labels.length} labels`);
const iconR = icons.reduce((s, o) => s + (o.x1 - o.x0 + 1 + o.y1 - o.y0 + 1) / 4, 0) / 5;
const labelW = labels.reduce((s, o) => s + o.x1 - o.x0 + 1, 0) / 4;
const labelH = labels.reduce((s, o) => s + o.y1 - o.y0 + 1, 0) / 4;
// landed: match by colour, in left-to-right order (each colour's objects in order)
const landed = objB.filter(big);
const byColour = (list, c) => list.filter((o) => o.colour === c);
const take = (o, list) => {
  // the object in `list` of the same colour and kind (icon ≈ disc, label ≈ capsule) nearest in order
  // labels cover ~0.6 of an icon's area (a 124 × 43 capsule vs a 99 px disc)
  const same = byColour(list, o.colour).filter((p) => !p.used && p.n < 2700 === o.kind > 0);
  const p = same[0];
  if (!p) throw new Error(`no landed match for ${o.id}`);
  p.used = true;
  return p;
};
const items = [
  ...icons.map((o, i) => ({ ...o, id: ICON_ORDER[i], kind: 0 })),
  ...labels.map((o, i) => ({ ...o, id: LABEL_ORDER[i], kind: 1 })),
].sort((a, b) => a.cx - b.cx);
const targets = {};
for (const o of items) {
  const p = take(o, landed);
  const [x, y] = toA(p.cx, p.cy);
  // label angle: principal axis (long side); icons don't need one
  let angle = o.kind ? p.angle : 0;
  if (Math.abs(angle) > 90) angle -= Math.sign(angle) * 180;
  targets[o.id] = { x: +x.toFixed(1), y: +y.toFixed(1), angle: +angle.toFixed(1) };
}

// ------------------------------------------------------------------ letters: stroke mask
const TOP = 215; // letters live below the icon row
const stroke = new Uint8Array(W * H);
const isStroke = ([r, g, b]) => Math.min(r, g, b) > 100 && Math.max(r, g, b) - Math.min(r, g, b) <= 10;
for (let y = TOP; y < H; y++) for (let x = 0; x < W; x++) if (isStroke(A.at(x, y))) stroke[y * W + x] = 1;
const CAP_Y = 246.5; // the letters' common top edge (T, H, N, K caps)

const drawLine = (ax, ay, bx, by) => {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3) + 1;
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
    for (const [dx, dy] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const px = Math.round(x + dx), py = Math.round(y + dy);
      if (px >= 0 && px < W && py >= TOP && py < H) stroke[py * W + px] = 1;
    }
  }
};

const repaired = [];
for (const L of labels) {
  const bx0 = L.x0 - 2, bx1 = L.x1 + 2, by0 = L.y0 - 2, by1 = L.y1 + 2;
  const inBox = (x, y, m = 0) => x >= bx0 - m && x <= bx1 + m && y >= by0 - m && y <= by1 + m;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (y >= TOP) stroke[y * W + x] = 0;
  // stubs: stroke pixels in a 4-px ring outside the box, clustered
  const ring = [];
  for (let y = by0 - 4; y <= by1 + 4; y++) for (let x = bx0 - 4; x <= bx1 + 4; x++)
    if (y >= TOP && y < H && x >= 0 && x < W && !inBox(x, y) && stroke[y * W + x]) ring.push([x, y]);
  const clusters = [];
  for (const p of ring) {
    const c = clusters.find((c) => c.some((q) => Math.abs(q[0] - p[0]) <= 2 && Math.abs(q[1] - p[1]) <= 2));
    if (c) c.push(p); else clusters.push([p]);
  }
  const stubs = clusters.map((c) => {
    const ex = c.reduce((s, p) => s + p[0], 0) / c.length, ey = c.reduce((s, p) => s + p[1], 0) / c.length;
    // the stroke continuing away from the box, up to 18 px
    const pts = [];
    for (let y = Math.round(ey) - 18; y <= ey + 18; y++) for (let x = Math.round(ex) - 18; x <= ex + 18; x++)
      if (y >= TOP && y < H && x >= 0 && x < W && stroke[y * W + x] && !inBox(x, y) && Math.hypot(x - ex, y - ey) <= 18) pts.push([x, y]);
    // keep pixels connected to the stub
    const set = new Set(pts.map((p) => p.join())), keep = [], st = [[Math.round(ex), Math.round(ey)]];
    const seen = new Set();
    while (st.length) {
      const [x, y] = st.pop(), k = `${x},${y}`;
      if (seen.has(k)) continue; seen.add(k);
      if (set.has(k)) keep.push([x, y]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = `${x + dx},${y + dy}`; if (set.has(n) && !seen.has(n)) st.push([x + dx, y + dy]); }
    }
    const P = keep.length > 3 ? keep : pts;
    const mx = P.reduce((s, p) => s + p[0], 0) / P.length, my = P.reduce((s, p) => s + p[1], 0) / P.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of P) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
    const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    let d = [Math.cos(a), Math.sin(a)];
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
    if ((cx - ex) * d[0] + (cy - ey) * d[1] < 0) d = [-d[0], -d[1]];
    // entry point: the stub centre moved onto its fitted line
    const t = (ex - mx) * d[0] + (ey - my) * d[1];
    return { e: [mx + d[0] * t, my + d[1] * t], d, used: false };
  });
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  // 1 · collinear pairs → straight through
  for (const s of stubs) for (const t of stubs) {
    if (s === t || s.used || t.used) continue;
    const anti = s.d[0] * -t.d[0] + s.d[1] * -t.d[1];
    const off = Math.abs(cross(s.d, [t.e[0] - s.e[0], t.e[1] - s.e[1]]));
    if (anti > Math.cos((6 * Math.PI) / 180) && off < 3) { drawLine(...s.e, ...t.e); s.used = t.used = true; repaired.push(`${L.colour} straight`); }
  }
  // 2 · corners: two edges meeting inside the box
  let best;
  do {
    best = null;
    for (const s of stubs) for (const t of stubs) {
      if (s === t || s.used || t.used) continue;
      const den = cross(s.d, t.d);
      if (Math.abs(den) < 0.05) continue;
      const w = [t.e[0] - s.e[0], t.e[1] - s.e[1]];
      const u = cross(w, t.d) / den, v = cross(w, s.d) / den;
      const P = [s.e[0] + s.d[0] * u, s.e[1] + s.d[1] * u];
      if (u > 0 && v > 0 && inBox(P[0], P[1], 3) && (!best || u + v < best.len)) best = { s, t, P, len: u + v };
    }
    if (best) { drawLine(...best.s.e, ...best.P); drawLine(...best.t.e, ...best.P); best.s.used = best.t.used = true; repaired.push(`${L.colour} corner`); }
  } while (best);
  // 3 · open ends: run up to the common cap line, then cap across
  const open = stubs.filter((s) => !s.used && s.d[1] < -0.2);
  const capped = open.map((s) => { const u = (CAP_Y - s.e[1]) / s.d[1]; return [s.e[0] + s.d[0] * u, CAP_Y, s]; }).filter((p) => inBox(p[0], p[1], 3));
  capped.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i + 1 < capped.length; i += 2) {
    drawLine(...capped[i][2].e, capped[i][0], capped[i][1]);
    drawLine(...capped[i + 1][2].e, capped[i + 1][0], capped[i + 1][1]);
    drawLine(capped[i][0], capped[i][1], capped[i + 1][0], capped[i + 1][1]);
    capped[i][2].used = capped[i + 1][2].used = true;
    repaired.push(`${L.colour} capped`);
  }
  const left = stubs.filter((s) => !s.used).length;
  if (left) repaired.push(`${L.colour}: ${left} unmatched stub(s)`);
}

// ------------------------------------------------------------------ fill → solid letters
const outside = new Uint8Array(W * H);
{
  const st = [];
  for (let x = 0; x < W; x++) { st.push(TOP * W + x, (H - 1) * W + x); }
  for (let y = TOP; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) {
    const p = st.pop();
    if (outside[p] || stroke[p]) continue;
    outside[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) st.push(p - 1);
    if (x < W - 1) st.push(p + 1);
    if (y > TOP) st.push(p - W);
    if (y < H - 1) st.push(p + W);
  }
}
const solid = (x, y) => x >= 0 && x < W && y >= TOP && y < H && !outside[y * W + x];
// components (letters)
const comp = new Int32Array(W * H).fill(-1);
const letters = [];
for (let y = TOP; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (!solid(x, y) || comp[p] >= 0) continue;
  const id = letters.length, st = [p];
  let n = 0, x0 = W, x1 = 0;
  comp[p] = id;
  while (st.length) {
    const q = st.pop(); n++;
    const qx = q % W, qy = (q - qx) / W;
    x0 = Math.min(x0, qx); x1 = Math.max(x1, qx);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = qx + dx, ny = qy + dy, nq = ny * W + nx;
      if (solid(nx, ny) && comp[nq] < 0) { comp[nq] = id; st.push(nq); }
    }
  }
  letters.push({ id, n, x0, x1 });
}
const real = letters.filter((l) => l.n > 2000).sort((a, b) => a.x0 - b.x0);
if (real.length !== 6) throw new Error(`expected 6 letters, found ${real.length}: ${real.map((l) => l.n)}`);

// ------------------------------------------------------------------ contours (marching squares on the binary mask)
function contours(inside) {
  // sample (i, j) = pixel (i-1, j-1); padded by one empty pixel. The mask is
  // softened (two 3 × 3 box passes) and the edge interpolated at 0.5, so curves
  // come out smooth (sub-pixel) instead of as pixel steps; straight edges stay straight.
  const Wp = W + 2, Hp = H - TOP + 2;
  let F = new Float32Array(Wp * Hp);
  for (let j = 1; j < Hp - 1; j++) for (let i = 1; i < Wp - 1; i++) F[j * Wp + i] = inside(i - 1, j - 1 + TOP) ? 1 : 0;
  for (let pass = 0; pass < 2; pass++) {
    const G = new Float32Array(Wp * Hp);
    for (let j = 1; j < Hp - 1; j++) for (let i = 1; i < Wp - 1; i++) {
      let sum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) sum += F[(j + dj) * Wp + i + di];
      G[j * Wp + i] = sum / 9;
    }
    F = G;
  }
  const val = (i, j) => F[j * Wp + i];
  const v = (i, j) => (val(i, j) >= 0.5 ? 1 : 0);
  const nH = Wp * Hp;
  const link = new Int32Array(4 * nH).fill(-1), pt = new Float64Array(4 * nH);
  const kH = (i, j) => j * Wp + i, kV = (i, j) => nH + j * Wp + i;
  const place = (k, i0, j0, i1, j1) => {
    const a = val(i0, j0), b = val(i1, j1), t = b !== a ? (0.5 - a) / (b - a) : 0.5;
    pt[2 * k] = i0 + t * (i1 - i0) - 1 + 0.5;
    pt[2 * k + 1] = j0 + t * (j1 - j0) - 1 + 0.5 + TOP;
  };
  const join = (a, b) => { link[2 * a + (link[2 * a] < 0 ? 0 : 1)] = b; link[2 * b + (link[2 * b] < 0 ? 0 : 1)] = a; };
  for (let j = 0; j < Hp - 1; j++) for (let i = 0; i < Wp - 1; i++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
    const code = (a << 3) | (b << 2) | (c << 1) | d;
    if (code === 0 || code === 15) continue;
    const T = kH(i, j), Bk = kH(i, j + 1), Lk = kV(i, j), R = kV(i + 1, j);
    if (a !== b) place(T, i, j, i + 1, j);
    if (d !== c) place(Bk, i, j + 1, i + 1, j + 1);
    if (a !== d) place(Lk, i, j, i, j + 1);
    if (b !== c) place(R, i + 1, j, i + 1, j + 1);
    switch (code) {
      case 1: case 14: join(Lk, Bk); break;
      case 2: case 13: join(Bk, R); break;
      case 3: case 12: join(Lk, R); break;
      case 4: case 11: join(T, R); break;
      case 6: case 9: join(T, Bk); break;
      case 7: case 8: join(T, Lk); break;
      case 5: join(T, Lk); join(R, Bk); break; // diagonal pixels: kept apart (solid regions touch only at corners)
      case 10: join(T, R); join(Lk, Bk); break;
    }
  }
  const seen = new Uint8Array(2 * nH), loops = [];
  for (let k0 = 0; k0 < 2 * nH; k0++) {
    if (seen[k0] || link[2 * k0] < 0) continue;
    const loop = [];
    let prev = -1, k = k0;
    while (!seen[k]) { seen[k] = 1; loop.push([pt[2 * k], pt[2 * k + 1]]); const n = link[2 * k] !== prev ? link[2 * k] : link[2 * k + 1]; prev = k; k = n; }
    loops.push(loop);
  }
  return loops;
}
const area = (P) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
function rdp(P, eps) {
  if (P.length < 3) return P;
  const [a, b] = [P[0], P[P.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < P.length - 1; i++) { const d = Math.abs(dy * P[i][0] - dx * P[i][1] + b[0] * a[1] - b[1] * a[0]) / len; if (d > max) { max = d; idx = i; } }
  if (max <= eps) return [a, b];
  return [...rdp(P.slice(0, idx + 1), eps).slice(0, -1), ...rdp(P.slice(idx), eps)];
}
function simplifyLoop(P, eps) {
  let far = 0, fd = 0;
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > fd) { fd = d; far = i; } }
  return [...rdp(P.slice(0, far + 1), eps).slice(0, -1), ...rdp([...P.slice(far), P[0]], eps).slice(0, -1)];
}

// ------------------------------------------------------------------ convex decomposition
const cross3 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function bridge(outer, holes) {
  // outer CCW, holes CW (in y-down screen coords "CCW" = negative area; we only need opposite windings)
  let poly = outer.slice();
  for (const hole of holes) {
    let hi = 0;
    for (let i = 1; i < hole.length; i++) if (hole[i][0] > hole[hi][0]) hi = i;
    const h = hole[hi];
    // nearest outer vertex whose segment to h crosses no edge
    const segX = (p1, p2, p3, p4) => {
      const d1 = cross3(p3, p4, p1), d2 = cross3(p3, p4, p2), d3 = cross3(p1, p2, p3), d4 = cross3(p1, p2, p4);
      return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    };
    const edges = [...poly.map((p, i) => [p, poly[(i + 1) % poly.length]]), ...hole.map((p, i) => [p, hole[(i + 1) % hole.length]])];
    let bi = -1, bd = Infinity;
    poly.forEach((p, i) => {
      const d = Math.hypot(p[0] - h[0], p[1] - h[1]);
      if (d < bd && !edges.some(([a, b]) => a !== p && b !== p && a !== h && b !== h && segX(p, h, a, b))) { bd = d; bi = i; }
    });
    const ring = [...hole.slice(hi), ...hole.slice(0, hi), h];
    poly = [...poly.slice(0, bi + 1), ...ring, poly[bi], ...poly.slice(bi + 1)];
  }
  return poly;
}
function triangulate(P) {
  // ear clipping; P oriented so that area > 0
  const idx = P.map((_, i) => i), tris = [];
  const inTri = (p, a, b, c) => cross3(a, b, p) >= 0 && cross3(b, c, p) >= 0 && cross3(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 100000) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = P[i0], b = P[i1], c = P[i2];
      if (cross3(a, b, c) <= 1e-9) continue; // reflex or degenerate
      let ok = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        const p = P[j];
        if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue;
        if (inTri(p, a, b, c)) { ok = false; break; }
      }
      if (!ok) continue;
      tris.push([i0, i1, i2]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) throw new Error("triangulation failed");
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}
function convexParts(P) {
  const tris = triangulate(P);
  let polys = tris.map((t) => t.slice());
  const isConvex = (poly) => poly.every((_, i) => cross3(P[poly[(i + poly.length - 1) % poly.length]], P[poly[i]], P[poly[(i + 1) % poly.length]]) >= -1e-9);
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < polys.length; a++) for (let b = a + 1; b < polys.length; b++) {
      const A = polys[a], Bp = polys[b];
      for (let i = 0; i < A.length; i++) {
        const u = A[i], v = A[(i + 1) % A.length];
        const j = Bp.findIndex((w, k) => w === v && Bp[(k + 1) % Bp.length] === u);
        if (j < 0) continue;
        // rebuild: A up to u, then B's chain from after v back to before u, then v..
        const chain = [];
        for (let k = 2; k < Bp.length; k++) chain.push(Bp[(j + k) % Bp.length]);
        const M = [...A.slice(0, i + 1), ...chain, ...A.slice(i + 1)];
        if (isConvex(M)) { polys[a] = M; polys.splice(b, 1); merged = true; break outer; }
      }
    }
  }
  return polys.map((poly) => poly.map((k) => P[k]));
}

// ------------------------------------------------------------------ straight-edged letters: fitted edges
// A and N are pure polygons whose junctions sit under labels, where a fill can
// leak. Each edge is fitted (least squares) to the visible stroke pixels near a
// seed segment (labels excluded), and every corner is the intersection of its
// two edges — exact even where the corner itself is hidden.
const STROKES = [];
for (let y = TOP; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isStroke(A.at(x, y))) continue;
  if (labels.some((L) => x >= L.x0 - 3 && x <= L.x1 + 3 && y >= L.y0 - 3 && y <= L.y1 + 3)) continue;
  STROKES.push([x, y]);
}
function fitEdge([[x0, y0], [x1, y1]], trim) {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const pts = STROKES.filter(([x, y]) => Math.abs(-(x - x0) * uy + (y - y0) * ux) <= 3.5 && (x - x0) * ux + (y - y0) * uy >= trim && (x - x0) * ux + (y - y0) * uy <= L - trim);
  if (pts.length < 10) throw new Error(`edge fit: only ${pts.length} px near ${[x0, y0, x1, y1]}`);
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { p: [mx, my], d: [Math.cos(a), Math.sin(a)] };
}
const meet = (e, f) => {
  const den = e.d[0] * f.d[1] - e.d[1] * f.d[0];
  const t = ((f.p[0] - e.p[0]) * f.d[1] - (f.p[1] - e.p[1]) * f.d[0]) / den;
  return [e.p[0] + e.d[0] * t, e.p[1] + e.d[1] * t];
};
const horiz = (y) => ({ p: [0, y], d: [1, 0] });
const vert = (x) => ({ p: [x, 0], d: [0, 1] });
const CAP_TOP = 246.5, BASE = 469.5;
// A — seeds read off the artwork; outer: left cap → bar top → top-right cap → right
// stroke → bottom cap → right stroke's inner edge → second stroke → bar underside
const aE = Object.fromEntries(Object.entries({
  barTop: [[[412, 311], [644, 241]], 8], capTR: [[[644, 241], [660, 260]], 4], rightOut: [[[660, 260], [545, 470]], 8],
  botCap: [[[545, 470], [520, 440]], 4], rightIn: [[[606, 287], [520, 440]], 8], diag2L: [[[542, 402], [485, 331]], 8],
  barBot: [[[437, 340], [606, 287]], 8], leftCap: [[[437, 340], [412, 311]], 4], diag2R: [[[559, 371], [525, 327]], 8],
}).map(([k, [seg, trim]]) => [k, fitEdge(seg, trim)]));
const POLY_A = {
  outer: [meet(aE.leftCap, aE.barTop), meet(aE.barTop, aE.capTR), meet(aE.capTR, aE.rightOut), meet(aE.rightOut, aE.botCap),
    meet(aE.botCap, aE.rightIn), meet(aE.rightIn, aE.diag2L), meet(aE.diag2L, aE.barBot), meet(aE.barBot, aE.leftCap)],
  holes: [[meet(aE.barBot, aE.rightIn), meet(aE.rightIn, aE.diag2R), meet(aE.diag2R, aE.barBot)]],
};
// N — vertical stems (stroke centres), shared cap/base lines, the diagonal's two fitted edges
const nUp = fitEdge([[700, 250], [753.5, 320]], 6), nLow = fitEdge([[727.5, 340], [819.5, 460]], 6);
const [nL, nLi, nRi, nR] = [672, 708.5, 815.5, 852];
const POLY_N = {
  outer: [[nL, BASE], [nL, CAP_TOP], meet(nUp, horiz(CAP_TOP)), meet(nUp, vert(nRi)), [nRi, CAP_TOP], [nR, CAP_TOP],
    [nR, BASE], meet(nLow, horiz(BASE)), meet(nLow, vert(nLi)), [nLi, BASE]],
  holes: [],
};

// ------------------------------------------------------------------ A leans on N
// The custom A is turned about its bottom tip, towards N, until its outline
// rests against N's left edge: the two outlines one stroke width apart
// (strokes touching, never crossing). Its collision parts are the same turned
// polygon, and the landing spots on the A turn with it.
const LEAN_GAP = 1.2; // between the two outline centre lines, scene units (~1.4 px stroke at desktop)
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const edgesOf = (P) => P.map((p, i) => [p, P[(i + 1) % P.length]]);
const segCross = (p1, p2, p3, p4) => {
  const d1 = cross3(p3, p4, p1), d2 = cross3(p3, p4, p2), d3 = cross3(p1, p2, p3), d4 = cross3(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};
const polyGap = (P, Q) => {
  for (const [a, b] of edgesOf(P)) for (const [c, d] of edgesOf(Q)) if (segCross(a, b, c, d)) return -1;
  let m = Infinity;
  for (const p of P) for (const [a, b] of edgesOf(Q)) m = Math.min(m, segDist(p, a, b));
  for (const q of Q) for (const [a, b] of edgesOf(P)) m = Math.min(m, segDist(q, a, b));
  return m;
};
const PIVOT = POLY_A.outer.reduce((m, p) => (p[1] > m[1] ? p : m)); // the A's bottom tip
const turn = (p, th) => {
  const c = Math.cos(th), sn = Math.sin(th), x = p[0] - PIVOT[0], y = p[1] - PIVOT[1];
  return [PIVOT[0] + x * c - y * sn, PIVOT[1] + x * sn + y * c];
};
let lo = 0, hi = (20 * Math.PI) / 180;
for (let i = 0; i < 60; i++) {
  const mid = (lo + hi) / 2;
  const g = polyGap(POLY_A.outer.map((p) => turn(p, mid)), POLY_N.outer);
  if (g > LEAN_GAP) lo = mid; else hi = mid;
}
const LEAN = lo;
POLY_A.outer = POLY_A.outer.map((p) => turn(p, LEAN));
POLY_A.holes = POLY_A.holes.map((h) => h.map((p) => turn(p, LEAN)));
for (const id of ["nanni", "instagram"]) {
  const t0 = targets[id], [x, y] = turn([t0.x, t0.y], LEAN);
  targets[id] = { x: +x.toFixed(1), y: +y.toFixed(1), angle: +(t0.angle + (LEAN * 180) / Math.PI).toFixed(1) };
}
const LEAN_DEG = +((LEAN * 180) / Math.PI).toFixed(2);
const gapNow = polyGap(POLY_A.outer, POLY_N.outer);

const LETTERS = ["T", "H", "A", "N", "K", "S"];
const FITTED = { A: POLY_A, N: POLY_N };
const r1 = (v) => Math.round(v * 10) / 10;
const orient = (outer, holes) => {
  if (area(outer) < 0) outer = outer.slice().reverse();
  return [outer, holes.map((h) => (area(h) > 0 ? h.slice().reverse() : h))];
};
const traced = (L, eps) => {
  const loops = contours((x, y) => comp[y * W + x] === L.id).map((l) => simplifyLoop(l, eps)).filter((l) => l.length >= 3 && Math.abs(area(l)) > 30);
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const [outer, ...holes] = loops;
  return orient(outer, holes);
};
const out = [];
for (const [n, L] of real.entries()) {
  const id = LETTERS[n];
  // drawn outline: fine; collision: a little coarser (fewer, fatter convex parts)
  const [outer, holes] = FITTED[id] ? orient(FITTED[id].outer, FITTED[id].holes) : traced(L, id === "S" ? 0.3 : 0.8);
  const [cOuter, cHoles] = FITTED[id] ? [outer, holes] : traced(L, id === "S" ? 1.6 : 1.2);
  const fmt = (l) => l.map((p) => p.map(r1));
  const d = [fmt(outer), ...holes.map(fmt)].map((l) => "M" + l.map((p) => `${p[0]} ${p[1]}`).join("L") + "Z").join("");
  const parts = convexParts(bridge(fmt(cOuter), cHoles.map(fmt))).filter((p) => Math.abs(area(p)) > 0.5);
  out.push({ id, d, parts: parts.map((p) => p.flat().map(r1)) });
}

// ------------------------------------------------------------------ write
// ------------------------------------------------------------------ crop: the upper 80 % of THANKS is shown
const ys = out.flatMap((l) => [...l.d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => +m[2]));
const TYPE_TOP = Math.min(...ys), TYPE_BOTTOM = Math.max(...ys);
const VIEW_H = r1(TYPE_TOP + 0.8 * (TYPE_BOTTOM - TYPE_TOP));

const ts = `/**
 * GENERATED by scripts/trace-thanks.mjs from the THANKS footer references
 * (scripts/reference/thanks-initial.png / thanks-landed.png). Do not edit by
 * hand — re-run the script (or replace with the original vector export).
 * Units: the initial reference's pixels (${W} × ${H}), the scene's coordinate system.
 */
export const SCENE_W = ${W};
export const SCENE_H = ${H};
/**
 * The footer shows the scene down to here: the upper 80 % of the THANKS
 * typography (letters ${r1(TYPE_TOP)}–${r1(TYPE_BOTTOM)}); the page ends on this line and the
 * letters run on beyond it. Their collision shapes are complete; the floor is here.
 */
export const VIEW_H = ${VIEW_H};
/** The custom A leans on N: turned ${LEAN_DEG}° about its bottom tip (outline gap to N: ${r1(gapNow)}). */
export const A_LEAN_DEG = ${LEAN_DEG};

/** THANKS letters: outline path (as drawn) and convex collision parts (flat x,y lists). */
export const LETTERS: readonly { id: string; d: string; parts: readonly (readonly number[])[] }[] = ${JSON.stringify(out)};

/** Designed (initial) composition. */
export const ICON_R = ${r1(iconR)};
export const LABEL_SIZE = { w: ${r1(labelW)}, h: ${r1(labelH)} } as const;
export const START: Record<string, { x: number; y: number }> = ${JSON.stringify(Object.fromEntries(items.map((o) => [o.id, { x: r1(o.cx), y: r1(o.cy) }])))};

/** Intended landed composition (the second reference), in the same units. */
export const TARGET: Record<string, { x: number; y: number; angle: number }> = ${JSON.stringify(targets)};
`;
writeFileSync("src/lib/footer/thanksScene.ts", ts);
console.log({ letters: out.map((l) => `${l.id}: ${l.parts.length} parts`), lean: LEAN_DEG, gapToN: r1(gapNow), crop: [r1(TYPE_TOP), r1(TYPE_BOTTOM), VIEW_H], repaired, iconR: r1(iconR), label: [r1(labelW), r1(labelH)], targets });
