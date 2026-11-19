/**
 * The Vision outline's "flight route" (VisionSection), computed in plain JS
 * from the path data instead of the DOM.
 *
 * The section needs, along the bird outline: where its two wing tips are
 * (min / max x), which way round the route from the left tip to the right tip
 * runs, and the head's x along that route as a monotonic lookup table. That
 * used to take 721 SVGPathElement.getPointAtLength calls at mount — each one
 * walks the whole 144-curve path — ≈ 125 ms of main thread on a fast desktop,
 * several times that on a phone (measured: one long animation frame at load).
 * Flattening the curves once and searching the points costs well under 1 ms.
 *
 * Positions are returned as FRACTIONS of the path's length, so the caller can
 * scale them by the browser's own getTotalLength() (dash lengths stay in the
 * browser's units). Pure and deterministic: memoised per path string (the
 * outline is static artwork — one entry; a different path gets its own).
 */
export interface BirdRoute {
  /** Left wing tip (min x) and right wing tip (max x), as fractions of the length. */
  left: number;
  right: number;
  /** true if, after the notch, the right wing comes first. */
  forward: boolean;
  /** Head x (viewBox units) along left tip → right tip, monotonic, `samples + 1` entries. */
  routeX: Float32Array;
}

const SEGMENTS_PER_CURVE = 32; // flattening: chord error ≪ 0.01 viewBox units here
const cache = new Map<string, BirdRoute>();

/** Points of a path made of absolute M / C / L / Z commands, with cumulative length. */
function flatten(d: string) {
  const tokens = d.match(/[MCLZmclz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const xs: number[] = [], ys: number[] = [], cum: number[] = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, len = 0, cmd = "";
  const num = () => Number(tokens[i++]);
  const push = (x: number, y: number) => {
    if (xs.length) len += Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]);
    xs.push(x);
    ys.push(y);
    cum.push(len);
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "M") {
      cx = sx = num();
      cy = sy = num();
      push(cx, cy);
      cmd = "L"; // further pairs after M are line-tos
    } else if (cmd === "L") {
      cx = num();
      cy = num();
      push(cx, cy);
    } else if (cmd === "C") {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      for (let k = 1; k <= SEGMENTS_PER_CURVE; k++) {
        const t = k / SEGMENTS_PER_CURVE, u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
        push(a * cx + b * x1 + c * x2 + e * x, a * cy + b * y1 + c * y2 + e * y);
      }
      cx = x;
      cy = y;
    } else if (cmd === "Z" || cmd === "z") {
      push(sx, sy);
      cx = sx;
      cy = sy;
    } else {
      throw new Error(`birdRoute: unsupported path command "${cmd}"`);
    }
  }
  return { xs, ys, cum, length: len };
}

export function birdRoute(d: string, samples = 240): BirdRoute {
  const key = `${samples}|${d}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { xs, cum, length: L } = flatten(d);
  // wing tips: the extreme x of the outline
  let iMin = 0, iMax = 0;
  for (let k = 1; k < xs.length; k++) {
    if (xs[k] < xs[iMin]) iMin = k;
    if (xs[k] > xs[iMax]) iMax = k;
  }
  const sLeft = cum[iMin], sRight = cum[iMax];
  const forward = sRight < sLeft;
  const p0 = sLeft, p1 = forward ? L + sRight : sRight - L;
  const mod = (v: number) => ((v % L) + L) % L;
  // x at an arc length (binary search on the cumulative lengths)
  const xAt = (s: number) => {
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = cum[hi] - cum[lo];
    return span > 0 ? xs[lo] + ((xs[hi] - xs[lo]) * (s - cum[lo])) / span : xs[lo];
  };
  const routeX = new Float32Array(samples + 1);
  for (let k = 0, run = -Infinity; k <= samples; k++) {
    run = Math.max(run, xAt(mod(p0 + (p1 - p0) * (k / samples))));
    routeX[k] = run;
  }
  const route: BirdRoute = { left: sLeft / L, right: sRight / L, forward, routeX };
  cache.set(key, route);
  return route;
}
