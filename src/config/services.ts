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
}

export interface ClipSources {
  webm: string;
  hevc: string;
}

export interface BirdClip {
  id: string;
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
  { id: "branding", label: "Branding", bird: null }, // future clip
  {
    id: "website",
    label: "Website",
    // Temporary demo, source public/videos/bird-videos/branding.mp4:
    // enter 0.8–3.6 s, exit (take-off) 6.792–9.0 s, crop 1240:1040:680:0.
    bird: {
      id: "website",
      enter: { webm: "/videos/bird/website.webm", hevc: "/videos/bird/website-hevc.mp4" },
      exit: { webm: "/videos/bird/website-exit.webm", hevc: "/videos/bird/website-exit-hevc.mp4" },
      meta: websiteMeta,
    },
  },
  { id: "production", label: "Production", bird: null }, // future clip
  { id: "marketing", label: "Marketing", bird: null }, // future clip
];

export const SERVICES_TUNING = {
  /** Hover intent before the bird flies in (desktop / keyboard). */
  hoverDelayMs: 1200,
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
} as const;
