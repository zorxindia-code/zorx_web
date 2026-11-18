/**
 * ZORX brand + experience configuration.
 * All supplied assets, measured geometry and timings live here so they can be
 * tuned without touching animation code.
 */

export const BRAND = {
  name: "ZORX",
  black: "#000000",
  ice: "#E8F5FF",
  white: "#FFFFFF",
} as const;

export const ASSETS = {
  /** Individual geometric elements — 739×739 Ice Blue squares with negative cut-outs. */
  z: "/logo/z.png",
  o: "/logo/o.png",
  x: "/logo/x.png",

  /** Official lockups (regular brand usage). */
  logoWhite: "/logo/zorx-logo-white.png",
  logoBlack: "/logo/zorx-logo-black.png",
  logoWhiteSymbol: "/logo/zorx-logo-white-without-text.png",
  logoBlackSymbol: "/logo/zorx-logo-black-without-text.png",

  /**
   * Cinematic intro bird — derived from /videos/Loading.mp4 (original untouched):
   * the original black bird and motion on the logo's Ice Blue (#E9F5FF) background,
   * 720², 4.0 s @ 29.97 fps, keyframe every 2 frames so the scroll-scrubbed settle
   * is cheap. Only the background level differs from the original. It is encoded
   * at (229,243,254) because Chrome and Safari lift video by (+4,+2,+1), landing
   * on Ice Blue (233,245,255); Firefox renders a few levels darker, which the
   * feathered edge in CSS (.zorx-loader) hides.
   * The clip is ONE slow wingbeat (wings curl down to ~1.2 s, lift back by 4.0 s).
   *   ffmpeg -i Loading.mp4 -an -vf "format=gray,lut=y='clip((val-20)*255/212,0,255)',
   *     format=rgb24,lutrgb=r='val*229/255':g='val*243/255':b='val*254/255',
   *     scale=720:720:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p"
   *     -colorspace bt709 -color_range tv -c:v libx264 -preset slow -crf 18
   *     -g 2 -keyint_min 1 -sc_threshold 0 -tune stillimage -movflags +faststart
   */
  loader: "/videos/optimized/loading-bird-ice.mp4",
  loaderDuration: 4.004,

  /**
   * The bird from inside the O, white (cut from o.png's transparent cut-out,
   * inverted), 540×266 — the stationary logo of the loader, and the cursor.
   * o.png itself is untouched.
   */
  birdIcon: { src: "/logo/derived/bird-white.png", width: 540, height: 266 },
  /**
   * The loading sun: a hand-drawn ring, black ink on transparent, 235×237. Its
   * stroke is bold at top and bottom and thins to faint, light strokes at the
   * sides — spun about its centre (116.5, 117.5), those light sides sweep round
   * like a spinner. The file is untouched (inverted to white in CSS on black).
   */
  loadingSun: { src: "/icons/loading_sun.png", width: 235, height: 237, cx: 116.5, cy: 117.5 },
  /**
   * Showreel, re-encoded from /videos/showreel.mp4 (3840×2160, 80 MB, with audio)
   * to silent H.264 with fast-start. Original untouched.
   */
  showreel: {
    small: "/videos/optimized/showreel-720.mp4",
    large: "/videos/optimized/showreel-1080.mp4",
    poster: "/videos/optimized/showreel-poster.jpg",
  },
} as const;

/**
 * Measured geometry of the supplied artwork (pixels in each source file).
 * The bird in the last frame of Loading.mp4 and the bird cut-out in o.png are the
 * same drawing (aspect 2.135 vs 2.132, equal stroke density), which is what lets
 * the video hand off to the O artwork with no visible change.
 */
export const GEOMETRY = {
  loaderFrame: 1080,
  loaderBird: { x: 81, y: 312, w: 901 }, // final frame, px in the 1080² video
  oSize: 739,
  oBird: { x: 120, y: 237, w: 516 }, // transparent cut-out, px in o.png

  /** Official lockup (zorx-logo-white.png, 1920×800). */
  lockup: {
    width: 1920,
    square: 611,
    gap: 45,
    /** "INTERACTIVE AGENCY" band, rows in the 1920-wide lockup */
    taglineTop: 690,
    taglineBottom: 800,
  },

  /** landing_showreel.jpeg (1600×900) — the exact showreel composition. */
  showreelRef: {
    W: 1600,
    H: 900,
    square: 185,
    frame: { w: 896, h: 504 },
    gap: 11,
  },
} as const;

export const TUNING = {
  /** Stage 01: the automatic loading phase lasts ~2 s (longer only if assets are slow). */
  loadingMinMs: 2000,
  loadingMaxMs: 3000,
  /**
   * Small loading-icon size of the video box: clamp(min, vmin × stage-min, max) px
   * (the bird itself is ~83% of the box → ~50–75 px). Mirrored in CSS (.zorx-loader)
   * so the icon is centred before JavaScript runs.
   */
  loaderIcon: { min: 60, vmin: 0.09, max: 90 },

  /** Logo state: lockup width as a fraction of viewport width. */
  logoLockupVw: { mobile: 0.86, desktop: 0.52 },
  /** Logo squares are at least this much larger than in the showreel, so Z/X shrink. */
  logoOverShowreel: 1.3,
  /** Tagline opacity — present, but never louder than the logo. */
  taglineOpacity: 0.78,
  /** Intro field colour: the exact Ice Blue of z.png / o.png / x.png (233,245,255). */
  introBg: "#E9F5FF",
  introIce: "#E9F5FF",

  /**
   * Wing-flap speed during the scroll-driven growth. The clip is one wingbeat per
   * 4.0 s; playback speeds up with growth progress from 1× (original, at rest)
   * to maxRate (3× → one beat every ~1.3 s) as the bird reaches the O.
   */
  flap: { maxRate: 3 },
  /** Z / X start at this fraction of the O size and scale up as they enter. */
  enterScale: 0.8,

  /**
   * Phase B–D: one pinned, scrubbed timeline. Segment lengths are in viewport
   * heights of scrolling (the timeline's duration units ARE vh).
   */
  scroll: {
    grow: 140, // bird video grows + moves into the O, flapping naturally;
    //            the white background contracts to the O square and turns Ice Blue
    settle: 70, // video scrubs to its final (logo) pose
    handoff: 20, // o.png fades in over the aligned video bird
    // Z from the left and X from the right run in lockstep with `grow` (same
    // start, span and ease, mirrored distance) — see buildScrollExperience.
    tagline: 60, // INTERACTIVE AGENCY settles under the completed logo
    taglineOverlap: 10,
    hold: 40, // completed logo rests
    showreel: 170, // logo → Z | showreel | X composition (landing_showreel.jpeg)
    lazyReelAt: 0.55, // start buffering the showreel at this overall progress
    scrub: 0.8, // ScrollTrigger scrub smoothing (s)
  },
} as const;
