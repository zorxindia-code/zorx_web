import { GEOMETRY as G, TUNING } from "@/config/brand";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** All rects are in stage pixels. */
export interface StageLayout {
  W: number;
  H: number;
  /** Loader: the white field fills the stage; the bird video is centred. */
  pre: { frame: Rect; video: Rect; z: Rect; x: Rect };
  /** Logo: field = O square; video lands so its bird sits exactly on o.png's bird. */
  logo: { frame: Rect; art: Rect; video: Rect; z: Rect; x: Rect; tagline: Rect };
  /** Showreel composition (landing_showreel.jpeg). */
  comp: { frame: Rect; art: Rect; z: Rect; x: Rect };
}

const sq = (x: number, y: number, s: number): Rect => ({ x, y, w: s, h: s });

/**
 * The bird in Loading.mp4's final frame and the cut-out in o.png are the same
 * drawing. Given where o.png is drawn, return where the video must be drawn so
 * the two birds coincide exactly (used only for the hand-off crossfade).
 */
function videoOverArt(art: Rect): Rect {
  const V = art.w * (G.oBird.w / G.oSize) * (G.loaderFrame / G.loaderBird.w);
  return sq(
    art.x + (G.oBird.x / G.oSize) * art.w - (G.loaderBird.x / G.loaderFrame) * V,
    art.y + (G.oBird.y / G.oSize) * art.w - (G.loaderBird.y / G.loaderFrame) * V,
    V,
  );
}

export function computeLayout(W: number, H: number): StageLayout {
  // ------------------------------------------------ showreel composition
  const ref = G.showreelRef;
  let compZ: Rect, compX: Rect, compFrame: Rect;

  if (W / H >= 1) {
    // Landscape: the reference composition, uniformly scaled and centred.
    const k = Math.min(W / ref.W, H / ref.H);
    const s = ref.square * k;
    const fw = ref.frame.w * k;
    const fh = ref.frame.h * k;
    const gap = ref.gap * k;
    compFrame = { x: (W - fw) / 2, y: (H - fh) / 2, w: fw, h: fh };
    compZ = sq(compFrame.x - gap - s, H / 2 - s / 2, s);
    compX = sq(compFrame.x + fw + gap, H / 2 - s / 2, s);
  } else {
    // Portrait: keep the showreel wide; Z tucks above-left, X below-right,
    // using the reference's square:frame-height and gap:frame-height ratios.
    const m = Math.max(16, W * 0.04);
    const fw = W - 2 * m;
    const fh = (fw * ref.frame.h) / ref.frame.w;
    const s = (fh * ref.square) / ref.frame.h;
    const gap = (fh * ref.gap) / ref.frame.h;
    compFrame = { x: m, y: (H - fh) / 2, w: fw, h: fh };
    compZ = sq(m, compFrame.y - gap - s, s);
    compX = sq(W - m - s, compFrame.y + fh + gap, s);
  }
  const compArt = sq(compFrame.x + (compFrame.w - compFrame.h) / 2, compFrame.y, compFrame.h);

  // ------------------------------------------------------- logo lockup
  const L0 = G.lockup;
  const blockH = L0.taglineBottom / L0.square; // squares + tagline, in square units
  const lockupFrac = W < 700 ? TUNING.logoLockupVw.mobile : TUNING.logoLockupVw.desktop;
  let s = ((W * lockupFrac) / L0.width) * L0.square;
  s = Math.max(s, compZ.w * TUNING.logoOverShowreel); // Z/X must shrink into the showreel
  s = Math.min(s, (W * 0.92 * L0.square) / L0.width, (H * 0.56) / blockH);

  const unit = s / L0.square; // px per lockup pixel
  const lockupW = L0.width * unit;
  const lx = (W - lockupW) / 2;
  const ly = (H - blockH * s) / 2;
  const gap = L0.gap * unit;
  const logoO = sq(lx + s + gap, ly, s);

  // ------------------------------------------------------- preloader icon
  // Same formula as .zorx-loader in globals.css (clamp(60px, 9cqmin, 90px)).
  const icon = TUNING.loaderIcon;
  const v = Math.min(icon.max, Math.max(icon.min, Math.min(W, H) * icon.vmin));
  const preVideo = sq((W - v) / 2, (H - v) / 2, v);

  // Z / X wait off-screen, slightly smaller, centred on the O's row — mirrored:
  // the lockup is centred, so one travel distance puts both just off-screen.
  const es = s * TUNING.enterScale;
  const ey = ly + (s - es) / 2;
  const zFinal = lx;
  const xFinal = lx + 2 * (s + gap);
  const travel = zFinal + s + 48; // = (W + 48) − xFinal, by symmetry

  // Covering square centred on the O centre: reaches every stage corner.
  const ocx = logoO.x + s / 2;
  const ocy = logoO.y + s / 2;
  const cover = 2 * Math.max(ocx, W - ocx, ocy, H - ocy);

  return {
    W,
    H,
    pre: {
      frame: sq(ocx - cover / 2, ocy - cover / 2, cover),
      video: preVideo,
      z: sq(zFinal - travel + (s - es) / 2, ey, es),
      x: sq(xFinal + travel + (s - es) / 2, ey, es),
    },
    logo: {
      frame: logoO,
      art: logoO,
      video: videoOverArt(logoO),
      z: sq(zFinal, ly, s),
      x: sq(xFinal, ly, s),
      tagline: {
        x: lx,
        y: ly + L0.taglineTop * unit,
        w: lockupW,
        h: (L0.taglineBottom - L0.taglineTop) * unit,
      },
    },
    comp: { frame: compFrame, art: compArt, z: compZ, x: compX },
  };
}
