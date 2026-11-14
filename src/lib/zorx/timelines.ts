import gsap from "gsap";
import { TUNING } from "@/config/brand";
import type { Rect, StageLayout } from "./layout";
import type { BirdController } from "./media";

/**
 * Everything the timeline animates. All motion is transform / opacity (plus one
 * clip-path on the reel). Layout is read lazily, so every tween re-flows on
 * resize (invalidateOnRefresh).
 */
export interface Rig {
  stage: HTMLElement; // pinned
  frame: HTMLElement; // Ice Blue O field (stage-sized, scaled)
  art: HTMLElement; // o.png
  loader: HTMLVideoElement; // the one bird video
  bird: BirdController;
  z: HTMLElement;
  x: HTMLElement;
  tagline: HTMLElement;
  hint: HTMLElement;
  reel: HTMLElement;
  reelVideo: HTMLVideoElement;
  L: () => StageLayout;
  /** Untransformed sizes (laid out at the largest state, scaled down). */
  base: () => { art: number; square: number; video: number };
  /** Called once when the showreel should start buffering. */
  onReelApproach: () => void;
  reduce: boolean;
}

type Get = (L: StageLayout) => Rect;

/** Ice Blue field: solid colour, so non-uniform scale is lossless. */
const field = (rig: Rig, get: Get) => ({
  x: () => get(rig.L()).x,
  y: () => get(rig.L()).y,
  scaleX: () => get(rig.L()).w / rig.L().W,
  scaleY: () => get(rig.L()).h / rig.L().H,
});

/** Square artwork / video: uniform scale, proportions locked. */
const square = (rig: Rig, get: Get, size: () => number) => ({
  x: () => get(rig.L()).x,
  y: () => get(rig.L()).y,
  scale: () => get(rig.L()).w / size(),
});

/** Reel clip that exposes exactly the area of a given field rect. */
const reelClip = (rig: Rig, get: Get) => () => {
  const f = rig.L().comp.frame;
  const r = get(rig.L());
  const t = Math.max(0, r.y - f.y);
  const l = Math.max(0, r.x - f.x);
  const b = Math.max(0, f.y + f.h - (r.y + r.h));
  const rt = Math.max(0, f.x + f.w - (r.x + r.w));
  return `inset(${t}px ${rt}px ${b}px ${l}px)`;
};

const now = (v: Record<string, () => number>) =>
  Object.fromEntries(Object.entries(v).map(([k, f]) => [k, f()]));

const sqBase = (rig: Rig) => () => rig.base().square;
const artBase = (rig: Rig) => () => rig.base().art;
const vidBase = (rig: Rig) => () => rig.base().video;

/** Initial state: full-screen white field, centred bird video. Nothing else is painted. */
export function setInitialState(rig: Rig) {
  gsap.set(rig.frame, { ...now(field(rig, (L) => L.pre.frame)), backgroundColor: TUNING.introBg });
  gsap.set(rig.reel.querySelector(".zorx-reel-frame"), { autoAlpha: 0 });
  gsap.set(rig.loader, now(square(rig, (L) => L.pre.video, vidBase(rig))));
  gsap.set(rig.art, now(square(rig, (L) => L.logo.art, artBase(rig))));
  gsap.set(rig.z, now(square(rig, (L) => L.pre.z, sqBase(rig))));
  gsap.set(rig.x, now(square(rig, (L) => L.pre.x, sqBase(rig))));
}

/**
 * Phases B–D as ONE scrubbed timeline on ONE pinned stage. Nothing here runs
 * on its own: the playhead only moves when the user scrolls (both directions).
 *
 *   grow      bird video scales + moves into the O — wings keep flapping (video
 *             plays) — while the white background contracts to the O square
 *             and shifts to the artwork's Ice Blue
 *   settle    video is scrubbed to its last frame (= o.png's bird pose)
 *   handoff   o.png fades in over the pixel-aligned video bird
 *   zx        Z from the left and X from the right — one tween, identical motion
 *   tagline   INTERACTIVE AGENCY settles (one text element)
 *   hold      the complete logo rests
 *   showreel  Z / X shrink outward, O grows into the reel frame, reel fades up
 */
export function buildScrollExperience(rig: Rig) {
  const S = TUNING.scroll;
  const growEnd = S.grow;
  const settleEnd = growEnd + S.settle;
  const handoffEnd = settleEnd + S.handoff;
  const zxStart = handoffEnd;
  const zxEnd = zxStart + S.zx;
  const tagStart = zxEnd - S.taglineOverlap;
  const holdStart = Math.max(zxEnd, tagStart + S.tagline);
  const reelStart = holdStart + S.hold;
  const total = reelStart + S.showreel;
  const reelFadeAt = reelStart + S.showreel * 0.42;

  const v = rig.reelVideo;
  let reelRequested = false;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: rig.stage,
      pin: true,
      start: "top top",
      end: () => `+=${(total / 100) * rig.L().H}`,
      scrub: rig.reduce ? true : S.scrub,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
    // Runs as the (smoothed) playhead moves — only cheap comparisons here.
    onUpdate: () => {
      const t = tl.time();
      // Bird video: natural playback → scroll-scrubbed settle → held on the logo pose.
      if (t < growEnd) {
        rig.bird.play();
        // Wings beat faster as the bird grows: 1× at rest → maxRate at the O.
        const p = t / growEnd;
        rig.bird.setRate(1 + (TUNING.flap.maxRate - 1) * p * p * (3 - 2 * p));
      }
      else if (t <= settleEnd) rig.bird.scrub((t - growEnd) / S.settle);
      else rig.bird.hold();
      // Showreel: buffer when approaching, decode only while visible.
      if (!reelRequested && t / total >= S.lazyReelAt) {
        reelRequested = true;
        rig.onReelApproach();
      }
      if (t >= reelFadeAt) {
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    },
  });

  const sb = sqBase(rig);
  const ab = artBase(rig);
  const vb = vidBase(rig);

  // Make the timeline exactly `total` long (units = vh of scrolling).
  tl.set({}, {}, total);

  // ---------------------------------------------------------------- B · grow
  tl.fromTo(rig.hint, { autoAlpha: 1 }, { autoAlpha: 0, duration: 30, ease: "power1.out" }, 0);
  tl.fromTo(
    rig.loader,
    square(rig, (L) => L.pre.video, vb),
    { ...square(rig, (L) => L.logo.video, vb), duration: S.grow, ease: "power2.inOut" },
    0,
  );

  // The background adapts with the bird: the white field contracts to the O
  // square in LOCKSTEP with the video (same duration + ease from the same
  // start), so the video's white frame always lies inside white — no blend
  // modes or filters needed. The Ice Blue arrives with o.png in the hand-off.
  tl.fromTo(
    rig.frame,
    field(rig, (L) => L.pre.frame),
    { ...field(rig, (L) => L.logo.frame), duration: S.grow, ease: "power2.inOut" },
    0,
  );

  // ---------------------------------------------------------------- handoff
  tl.fromTo(rig.art, { autoAlpha: 0 }, { autoAlpha: 1, duration: S.handoff }, settleEnd);
  tl.set(rig.loader, { autoAlpha: 0 }, handoffEnd);
  tl.set(rig.frame, { backgroundColor: TUNING.introIce }, handoffEnd); // hidden under o.png

  // ---------------------------------------------------------------- C · Z / X
  // One tween for both: same start, duration and ease, mirrored distances
  // (layout.pre.z / pre.x) — they arrive at exactly the same moment.
  tl.set([rig.z, rig.x], { autoAlpha: 1 }, zxStart);
  tl.fromTo(
    [rig.z, rig.x],
    {
      x: (i: number) => (i ? rig.L().pre.x : rig.L().pre.z).x,
      y: (i: number) => (i ? rig.L().pre.x : rig.L().pre.z).y,
      scale: (i: number) => (i ? rig.L().pre.x : rig.L().pre.z).w / sb(),
    },
    {
      x: (i: number) => (i ? rig.L().logo.x : rig.L().logo.z).x,
      y: (i: number) => (i ? rig.L().logo.x : rig.L().logo.z).y,
      scale: (i: number) => (i ? rig.L().logo.x : rig.L().logo.z).w / sb(),
      duration: S.zx,
      ease: "power3.out",
    },
    zxStart,
  );
  tl.fromTo(
    rig.tagline,
    { autoAlpha: 0, yPercent: 60 },
    { autoAlpha: TUNING.taglineOpacity, yPercent: 0, duration: S.tagline, ease: "power2.out" },
    tagStart,
  );

  // ---------------------------------------------------------------- D · showreel
  const R = S.showreel;
  const D = R * 0.85;
  const E = "power2.inOut";
  const later = { ease: E, immediateRender: false } as const;
  tl.fromTo(rig.z, square(rig, (L) => L.logo.z, sb), { ...square(rig, (L) => L.comp.z, sb), duration: D, ...later }, reelStart);
  tl.fromTo(rig.x, square(rig, (L) => L.logo.x, sb), { ...square(rig, (L) => L.comp.x, sb), duration: D, ...later }, reelStart);
  tl.fromTo(rig.frame, field(rig, (L) => L.logo.frame), { ...field(rig, (L) => L.comp.frame), duration: D, ...later }, reelStart);
  tl.fromTo(rig.art, square(rig, (L) => L.logo.art, ab), { ...square(rig, (L) => L.comp.art, ab), duration: D, ...later }, reelStart);
  tl.fromTo(
    rig.reel,
    { clipPath: reelClip(rig, (L) => L.logo.frame) },
    { clipPath: reelClip(rig, (L) => L.comp.frame), duration: D, ...later },
    reelStart,
  );
  tl.fromTo(
    rig.tagline,
    { autoAlpha: TUNING.taglineOpacity, yPercent: 0 },
    { autoAlpha: 0, yPercent: 40, duration: R * 0.14, ease: "power1.in", immediateRender: false },
    reelStart,
  );
  tl.fromTo(rig.reel, { autoAlpha: 0 }, { autoAlpha: 1, duration: R * 0.4, ease: "power1.inOut", immediateRender: false }, reelFadeAt);
  tl.fromTo(v, { scale: 1.12 }, { scale: 1, duration: R * 0.6, ease: "power2.out", immediateRender: false }, reelStart + R * 0.3);
  // 2px stroke appears once the frame has reached its final size.
  tl.fromTo(
    rig.reel.querySelector(".zorx-reel-frame"),
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: R * 0.15, ease: "power1.out", immediateRender: false },
    reelStart + D,
  );

  return tl;
}
