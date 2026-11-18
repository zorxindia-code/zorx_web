#!/usr/bin/env node
/**
 * Traces the supplied contact-map artwork (1037 × 780 PNG: blue seas on a white
 * ground, two red ring markers and a small black bird) into vectors, so the map
 * renders exactly like the artwork at any size:
 *
 *   node scripts/trace-contact-map.mjs scripts/reference/contact-map.png
 *
 * Writes
 *   public/images/contact-map.svg   the seas (blue) on white — the static map
 *   src/lib/contactMap.ts           marker centres, the bird silhouette and the
 *                                   flight route, all in the artwork's units
 *
 * Method: sub-pixel marching squares on the anti-aliased artwork (iso 0.5),
 * then Ramer–Douglas–Peucker. The markers and the bird are lifted off the seas
 * (they are drawn live on top: pulsing pins, flying bird). The route runs from
 * the India marker to the UAE marker through the bird's position in the
 * artwork, along the bird's own heading, so the flying bird crosses that exact
 * spot in that exact pose.
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const input = process.argv[2];
if (!input) throw new Error("usage: node scripts/trace-contact-map.mjs <contact-map.png>");

const SEA = [71, 129, 255]; // #4781FF, measured
const MARKER_R = 9.5; // markers are cleared within this radius (ring outer edge ≈ 8.4)

const { data, info } = await sharp(readFileSync(input)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const at = (x, y, c) => data[(y * W + x) * C + c];

// ---------------------------------------------------------------- markers
// Red pixels, clustered; centre = redness-weighted centroid.
const red = [];
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const r = at(x, y, 0), g = at(x, y, 1), b = at(x, y, 2);
    if (r > g + 30 && r > b + 30) red.push([x, y, (r - g) / 255]);
  }
const clusters = [];
for (const p of red) {
  const c = clusters.find((k) => Math.abs(k.x0 - p[0]) < 30 && Math.abs(k.y0 - p[1]) < 30);
  if (c) c.pts.push(p);
  else clusters.push({ x0: p[0], y0: p[1], pts: [p] });
}
const markers = clusters
  .filter((c) => c.pts.length > 40)
  .map((c) => {
    let sx = 0, sy = 0, sw = 0;
    for (const [x, y, w] of c.pts) {
      sx += w * (x + 0.5);
      sy += w * (y + 0.5);
      sw += w;
    }
    return [sx / sw, sy / sw];
  })
  .sort((a, b) => a[0] - b[0]); // west → east: UAE, India
if (markers.length !== 2) throw new Error(`expected 2 markers, found ${markers.length}`);
const [uae, india] = markers;

// ---------------------------------------------------------------- bird box
let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (at(x, y, 0) + at(x, y, 1) + at(x, y, 2) < 150) {
      bx0 = Math.min(bx0, x);
      bx1 = Math.max(bx1, x);
      by0 = Math.min(by0, y);
      by1 = Math.max(by1, y);
    }
const BIRD_BOX = [bx0 - 6, by0 - 6, bx1 + 6, by1 + 6];
const inBirdBox = (x, y) => x >= BIRD_BOX[0] && x <= BIRD_BOX[2] && y >= BIRD_BOX[1] && y <= BIRD_BOX[3];

// ---------------------------------------------------------------- marching squares
/** Contours of field(x, y) ∈ [0,1] at 0.5, as closed loops in image px. */
function contours(field, pad) {
  const Wp = W + 2 * pad + 2, Hp = H + 2 * pad + 2; // `pad` replicated px, then one 0 px
  const f = new Float32Array(Wp * Hp);
  for (let j = 1; j < Hp - 1; j++)
    for (let i = 1; i < Wp - 1; i++) {
      const x = Math.min(W - 1, Math.max(0, i - 1 - pad));
      const y = Math.min(H - 1, Math.max(0, j - 1 - pad));
      f[j * Wp + i] = field(x, y);
    }
  const off = 1 + pad; // sample (i, j) sits at image px centre (i - off + 0.5, j - off + 0.5)
  const nH = Wp * Hp;
  const link = new Int32Array(2 * nH * 2).fill(-1);
  const pt = new Float32Array(2 * nH * 2);
  const v = (i, j) => f[j * Wp + i];
  const keyH = (i, j) => j * Wp + i; // edge (i,j)–(i+1,j)
  const keyV = (i, j) => nH + j * Wp + i; // edge (i,j)–(i,j+1)
  const place = (k, i0, j0, i1, j1) => {
    const a = v(i0, j0), b = v(i1, j1), t = (0.5 - a) / (b - a);
    pt[2 * k] = i0 + t * (i1 - i0) - off + 0.5;
    pt[2 * k + 1] = j0 + t * (j1 - j0) - off + 0.5;
  };
  const join = (k1, k2) => {
    link[2 * k1 + (link[2 * k1] < 0 ? 0 : 1)] = k2;
    link[2 * k2 + (link[2 * k2] < 0 ? 0 : 1)] = k1;
  };
  for (let j = 0; j < Hp - 1; j++)
    for (let i = 0; i < Wp - 1; i++) {
      const a = v(i, j) >= 0.5, b = v(i + 1, j) >= 0.5, c = v(i + 1, j + 1) >= 0.5, d = v(i, j + 1) >= 0.5;
      const code = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const T = keyH(i, j), B = keyH(i, j + 1), L = keyV(i, j), R = keyV(i + 1, j);
      if (a !== b) place(T, i, j, i + 1, j);
      if (d !== c) place(B, i, j + 1, i + 1, j + 1);
      if (a !== d) place(L, i, j, i, j + 1);
      if (b !== c) place(R, i + 1, j, i + 1, j + 1);
      const centre = (v(i, j) + v(i + 1, j) + v(i + 1, j + 1) + v(i, j + 1)) / 4 >= 0.5;
      switch (code) {
        case 1: case 14: join(L, B); break;
        case 2: case 13: join(B, R); break;
        case 3: case 12: join(L, R); break;
        case 4: case 11: join(T, R); break;
        case 6: case 9: join(T, B); break;
        case 7: case 8: join(T, L); break;
        case 5: if (centre) { join(T, L); join(R, B); } else { join(T, R); join(L, B); } break;
        case 10: if (centre) { join(T, R); join(L, B); } else { join(T, L); join(R, B); } break;
      }
    }
  const seen = new Uint8Array(2 * nH);
  const loops = [];
  for (let k0 = 0; k0 < 2 * nH; k0++) {
    if (seen[k0] || link[2 * k0] < 0) continue;
    const loop = [];
    let prev = -1, k = k0;
    while (!seen[k]) {
      seen[k] = 1;
      loop.push([pt[2 * k], pt[2 * k + 1]]);
      const next = link[2 * k] !== prev ? link[2 * k] : link[2 * k + 1];
      prev = k;
      k = next;
    }
    loops.push(loop);
  }
  return loops;
}

const area = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}
function simplifyLoop(pts, eps) {
  let far = 0, fd = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = rdp(pts.slice(0, far + 1), eps), b = rdp([...pts.slice(far), pts[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}
const fmt = (n, dp) => {
  const s = n.toFixed(dp).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
};
const toPath = (loops, dp) => loops.map((l) => "M" + l.map((p) => `${fmt(p[0], dp)} ${fmt(p[1], dp)}`).join("L") + "Z").join("");

// ---------------------------------------------------------------- seas
const seaField = (x, y) => {
  for (const [mx, my] of markers) if (Math.hypot(x + 0.5 - mx, y + 0.5 - my) < MARKER_R) return 0; // pins: land
  if (inBirdBox(x, y)) return 1; // the bird flies over open sea
  return Math.min(1, Math.max(0, (255 - at(x, y, 0)) / (255 - SEA[0])));
};
const seaLoops = contours(seaField, 3)
  .filter((l) => Math.abs(area(l)) > 3)
  .map((l) => simplifyLoop(l, 0.22));
const seaPath = toPath(seaLoops, 1);

// ---------------------------------------------------------------- bird
const birdField = (x, y) => (inBirdBox(x, y) ? Math.min(1, Math.max(0, 1 - at(x, y, 2) / 255)) : 0);
const birdLoops = contours(birdField, 0).filter((l) => Math.abs(area(l)) > 1).map((l) => simplifyLoop(l, 0.12));
// Centre = area centroid; heading = perpendicular to the wing span (the two
// farthest-apart outline points), toward the head (the side with the beak, -y).
let cx = 0, cy = 0, A = 0;
for (const l of birdLoops) {
  for (let i = 0; i < l.length; i++) {
    const p = l[i], q = l[(i + 1) % l.length], cr = p[0] * q[1] - q[0] * p[1];
    A += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
  }
}
cx /= 3 * A; cy /= 3 * A;
const outline = birdLoops.flat();
let span = [outline[0], outline[0]], best = 0;
for (const p of outline)
  for (const q of outline) {
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d > best) {
      best = d;
      span = [p, q];
    }
  }
const wing = Math.atan2(span[1][1] - span[0][1], span[1][0] - span[0][0]);
let heading = wing - Math.PI / 2;
if (Math.sin(heading) > 0) heading += Math.PI; // head points up-screen in the artwork
heading = Math.atan2(Math.sin(heading), Math.cos(heading)); // (-π, π]
const cos = Math.cos(-heading), sin = Math.sin(-heading);
const local = birdLoops.map((l) => l.map(([x, y]) => [(x - cx) * cos - (y - cy) * sin, (x - cx) * sin + (y - cy) * cos]));
const lx = local.flat().map((p) => p[0]), ly = local.flat().map((p) => p[1]);
const birdBox = [Math.min(...lx), Math.min(...ly), Math.max(...lx), Math.max(...ly)].map((n) => +n.toFixed(2));

// ---------------------------------------------------------------- route
// India → UAE through the bird, tangent to its heading there: two quadratics
// joined at the bird (smooth, G1). The heading is steeper than the chord to
// the UAE, so the path is a gentle S — west along the coast, a lift north at
// the bird, then easing west into the UAE marker.
const h = [Math.cos(heading), Math.sin(heading)];
const a = 0.45 * Math.hypot(cx - india[0], cy - india[1]);
const b = 0.4 * Math.hypot(uae[0] - cx, uae[1] - cy);
const C1 = [cx - a * h[0], cy - a * h[1]];
const C2 = [cx + b * h[0], cy + b * h[1]];

// ---------------------------------------------------------------- write
const r1 = (n) => +n.toFixed(1), r2 = (n) => +n.toFixed(2);
writeFileSync(
  new URL("../public/images/contact-map.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="#fff"/>` +
    `<path fill="#${SEA.map((c) => c.toString(16).padStart(2, "0")).join("")}" fill-rule="evenodd" d="${seaPath}"/></svg>\n`,
);
writeFileSync(
  new URL("../src/lib/contactMap.ts", import.meta.url),
  `/**
 * GENERATED by scripts/trace-contact-map.mjs from the supplied contact-map
 * artwork (${W} × ${H}). Do not edit by hand — re-run the script.
 * All values are in the artwork's pixel units (the map's SVG viewBox).
 */
export const MAP_W = ${W};
export const MAP_H = ${H};
/** The static map (seas on white), traced from the artwork. */
export const MAP_IMAGE = "/images/contact-map.svg";

/** Marker centres, as in the artwork (red dot r 3.3, ring r 7.5 × 1.9 wide). */
export const MAP_MARKERS = {
  uae: { x: ${r2(uae[0])}, y: ${r2(uae[1])} }, // Dubai
  india: { x: ${r2(india[0])}, y: ${r2(india[1])} }, // Kerala
} as const;
export const MARKER = { dot: 3.3, ring: 7.5, ringWidth: 1.9, color: "#f2353b" } as const;

/**
 * The artwork's black bird, seen from above: centred on its centroid and
 * turned to face +x (so it can be rotated to its direction of flight).
 * In the artwork it sits at BIRD_REST, heading BIRD_REST.angle degrees.
 */
export const BIRD_PATH =
  ${JSON.stringify(toPath(local, 2))};
/** Bounding box of BIRD_PATH: [minX, minY, maxX, maxY]. */
export const BIRD_BOX = ${JSON.stringify(birdBox)} as const;
export const BIRD_REST = { x: ${r2(cx)}, y: ${r2(cy)}, angle: ${r2((heading * 180) / Math.PI)} } as const;

/** Flight route India → UAE, through BIRD_REST along the bird's heading. */
export const ROUTE =
  "M${r1(india[0])} ${r1(india[1])}Q${r1(C1[0])} ${r1(C1[1])} ${r1(cx)} ${r1(cy)}Q${r1(C2[0])} ${r1(C2[1])} ${r1(uae[0])} ${r1(uae[1])}";
`,
);
console.log({
  markers: { uae: uae.map(r2), india: india.map(r2) },
  bird: { centre: [r2(cx), r2(cy)], heading: r2((heading * 180) / Math.PI), box: birdBox },
  route: { C1: C1.map(r1), C2: C2.map(r1) },
  seaLoops: seaLoops.length,
  seaKB: +(seaPath.length / 1024).toFixed(1),
});
