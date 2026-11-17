/**
 * Services section content + per-service bird clips.
 *
 * Each bird has an ENTER clip (flies in, lands, rests on its last frame) and an
 * optional EXIT clip (takes off from the same resting pose, flies out). Both are
 * produced offline by scripts/process-bird-video.mjs from a green-screen source
 * with the SAME crop, so they share one coordinate system: transparent VP9 WebM
 * (Chrome/Firefox/Edge) + HEVC-alpha MP4 (Safari/iOS) + placement metadata.
 * Add a service's bird by processing its source and filling in `bird` — no code
 * changes needed.
 */
import websiteMeta from "../../public/videos/bird/website.json";
import productionMeta from "../../public/videos/bird/production.json";
import brandingMeta from "../../public/videos/bird/branding-bird.json";
import marketingMeta from "../../public/videos/bird/marketing.json";

export interface BirdPlacement {
  /** Video frame size (px). */
  width: number;
  height: number;
  duration: number;
  /** Perch line (source line, removed) — aligned to the row's divider. */
  lineY: number;
  /** Resting-pose bounds of the bird. */
  bird: { x0: number; x1: number; y0: number; y1: number };
  /** Horizontal centre of the feet at rest. */
  feetX: number;
  /** Highest point the bird reaches during the clip. */
  flightTop: number;
  /** Below-line part of the resting bird (tail / feet), if measured. */
  tail?: { x0: number; x1: number } | null;
}

export interface ClipSources {
  webm: string;
  hevc: string;
}

export interface BirdClip {
  id: string;
  /** Side of the row the bird rests on — and enters from / leaves towards. */
  side: "left" | "right";
  /** Size multiplier on the shared perched-height rule (default 1). */
  size?: number;
  /** Fly in → land → rest (last frame). */
  enter: ClipSources;
  /** Take off from the resting pose → fly out. Null = fade out instead. */
  exit: ClipSources | null;
  /** Placement of the enter clip (the exit clip shares its coordinates). */
  meta: BirdPlacement;
}

export interface Service {
  id: string;
  label: string;
  /** Bird that lands on the divider below this row; null = typography only. */
  bird: BirdClip | null;
}

export const SERVICES: readonly Service[] = [
  {
    id: "branding",
    label: "Branding",
    // Peacock, source public/videos/bird-videos/peacock.mp4 (portrait 1080×1920,
    // one take, split on the same frame, 5.417 s): enter 0–5.458 s (fly in from the
    // left, land, settle facing forward — the settle at 2×), exit 5.417–10.0 s
    // (wings up, take off, fly left). No perch line in this footage: the perch is
    // set where the toes grip (source y 1196: outer toe tips on the divider, middle claws over it). Crop 1080:1300:0:400, "protect" key
    // with --protect-still (keeps the green tail, no green fringes on fast wings).
    bird: {
      id: "branding",
      side: "left", // peacock: enters from the left, leaves to the left
      size: 1.52, // ~+17% over the earlier 1.3 (still clamped clear of the text)
      enter: { webm: "/videos/bird/branding-bird.webm", hevc: "/videos/bird/branding-bird-hevc.mp4" },
      exit: { webm: "/videos/bird/branding-bird-exit.webm", hevc: "/videos/bird/branding-bird-exit-hevc.mp4" },
      meta: brandingMeta,
    },
  },
  {
    id: "website",
    label: "Website",
    // Temporary demo, source public/videos/bird-videos/branding.mp4:
    // enter 0.8–3.6 s, exit (take-off) 6.792–9.0 s, crop 1240:1040:680:0.
    bird: {
      id: "website",
      side: "right", // woodpecker: enters from the right, leaves to the right
      enter: { webm: "/videos/bird/website.webm", hevc: "/videos/bird/website-hevc.mp4" },
      exit: { webm: "/videos/bird/website-exit.webm", hevc: "/videos/bird/website-exit-hevc.mp4" },
      meta: websiteMeta,
    },
  },
  {
    id: "production",
    label: "Production",
    // Owl, source public/videos/bird-videos/owl.mp4 (one continuous take, split on
    // the same perched frame): enter 0–4.417 s, exit 4.417–7.0 s, crop
    // 1500:1080:0:0, linear key + temporal + line-stabilised, exit top-feathered
    // (the owl climbs out of the source frame). See README for the exact command.
    bird: {
      id: "production",
      side: "left", // owl: enters from the left, leaves to the left
      // 1.04 × the shared 0.775 rule = the owl's original rendered size (1.3 × 0.62):
      // it stays at its normal size while the other birds are 1.25× larger.
      size: 1.04,
      enter: { webm: "/videos/bird/production.webm", hevc: "/videos/bird/production-hevc.mp4" },
      exit: { webm: "/videos/bird/production-exit.webm", hevc: "/videos/bird/production-exit-hevc.mp4" },
      meta: productionMeta,
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    // Macaw, source public/videos/bird-videos/macaw.mp4: enter 0–3.917 s (fly in from
    // the right, land, settle facing forward), exit 4.583–7.0 s (take off, fly right)
    // — two pose-matched resting frames. Crop 1580:1080:340:0 + 150 px transparent
    // canvas below the source, where the tail tip the source frame cuts off is
    // rebuilt. See README for the exact commands.
    bird: {
      id: "marketing",
      side: "right", // macaw: enters from the right, leaves to the right
      size: 1.3,
      enter: { webm: "/videos/bird/marketing.webm", hevc: "/videos/bird/marketing-hevc.mp4" },
      exit: { webm: "/videos/bird/marketing-exit.webm", hevc: "/videos/bird/marketing-exit-hevc.mp4" },
      meta: marketingMeta,
    },
  },
];

export const SERVICES_TUNING = {
  /** Hover intent before the bird flies in (desktop / keyboard). */
  hoverDelayMs: 750,
  /** Tap: short intentional delay before the bird flies in. */
  tapDelayMs: 450,
  /** Resting bird height above the divider, as a fraction of the row height.
   *  0.775 = 1.25 × the earlier 0.62 — every bird (enter and exit share one
   *  placement) 25% larger; the text / tail / section clamps still apply. */
  birdHeightOfRow: 0.775,
  /** Longest wait for a clip to be playable without stalling before it starts anyway (ms). */
  readyTimeoutMs: 8000,
  /** Playback speed of every entrance and exit flight (1 = as filmed). */
  playbackRate: 1.35,
  /** Bird never smaller than this (px above the line), even on tight layouts. */
  minBirdHeight: 34,
  /** Fade used only when a bird has no exit clip, or with reduced motion (s). */
  fade: 0.3,
  /** Overlap between the resting enter frame and the first exit frame (s). */
  handoff: 0.12,
  /** Fade over the last moments of an exit clip, so no sliver can linger (s). */
  exitTailFade: 0.15,
} as const;
