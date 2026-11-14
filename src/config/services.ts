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
    // Peacock, source public/videos/bird-videos/peacock.mp4: enter 0–2.542 s (fly in,
    // land, settle facing forward), exit 4.75–7.0 s (take off, fly left) — two
    // pose-matched frames, so the idle head-turning in between is skipped. Crop
    // 1500:1080:0:0, "protect" key (keeps the natural green tail), line-stabilised.
    bird: {
      id: "branding",
      side: "left", // peacock: enters from the left, leaves to the left
      size: 1.3,
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
      size: 1.3, // owls read larger than the woodpecker; still clamped clear of the text
      enter: { webm: "/videos/bird/production.webm", hevc: "/videos/bird/production-hevc.mp4" },
      exit: { webm: "/videos/bird/production-exit.webm", hevc: "/videos/bird/production-exit-hevc.mp4" },
      meta: productionMeta,
    },
  },
  { id: "marketing", label: "Marketing", bird: null }, // future clip
];

export const SERVICES_TUNING = {
  /** Hover intent before the bird flies in (desktop / keyboard). */
  hoverDelayMs: 750,
  /** Tap: short intentional delay before the bird flies in. */
  tapDelayMs: 450,
  /** Resting bird height above the divider, as a fraction of the row height. */
  birdHeightOfRow: 0.62,
  /** Bird never smaller than this (px above the line), even on tight layouts. */
  minBirdHeight: 34,
  /** Fade used only when a bird has no exit clip, or with reduced motion (s). */
  fade: 0.3,
  /** Overlap between the resting enter frame and the first exit frame (s). */
  handoff: 0.12,
  /** Fade over the last moments of an exit clip, so no sliver can linger (s). */
  exitTailFade: 0.15,
} as const;
