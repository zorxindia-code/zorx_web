import type { LenisOptions } from "lenis";

/**
 * Global smooth scrolling (Lenis — src/components/providers/SmoothScrollProvider.tsx).
 *
 * Wheel and trackpad input is smoothed (an eased glide that follows the input,
 * then settles); touch keeps the platform's native scrolling (syncTouch: false).
 * Driven by GSAP's ticker, never by its own requestAnimationFrame (autoRaf: false).
 * Not used with prefers-reduced-motion: native scrolling.
 */
export const SMOOTH_SCROLL: LenisOptions = {
  autoRaf: false,
  smoothWheel: true,
  /** Glide: share of the remaining distance covered per frame (lower = smoother, longer tail). */
  lerp: 0.085, // tuned from 0.075: same glide, a shorter settle (~0.95 s vs ~1.1 s for a wheel notch)
  /** Wheel distance factor: tames aggressive wheels without fixing a velocity. */
  wheelMultiplier: 0.8,
  touchMultiplier: 1,
  syncTouch: false,
  orientation: "vertical",
  gestureOrientation: "vertical",
  infinite: false,
};
