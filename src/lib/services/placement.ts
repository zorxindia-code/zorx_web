import { SERVICES_TUNING as T, type BirdPlacement } from "@/config/services";

export interface PlacementInput {
  /** Section width (px). */
  width: number;
  /** Divider centre (px from the section top). */
  dividerY: number;
  /** Height of the row the divider belongs to. */
  rowHeight: number;
  /** Right edge of the active row's text. */
  textRight: number;
  /** Right edge of the next row's text (the tail hangs into that row). */
  nextTextRight: number;
}

export interface Placement {
  x: number;
  y: number;
  scale: number;
}

/**
 * Where the bird video sits so that, at rest, its feet are on the divider:
 *  - size from the row height (perched height = birdHeightOfRow × row)
 *  - right edge of the resting bird near the section's right margin
 *  - shrinks if needed so it never overlaps the active row's text, and its
 *    tail stays clear of the next row's text
 *  - the video's own right edge stays beyond the section, so the bird always
 *    flies in from off-screen
 */
export function placeBird(m: BirdPlacement, p: PlacementInput): Placement {
  const margin = Math.max(16, p.width * 0.05);
  const gap = Math.max(12, p.width * 0.025);
  const right = p.width - margin;
  const above = m.lineY - m.bird.y0; // resting height above the perch line

  let s = (p.rowHeight * T.birdHeightOfRow) / above;
  // Stay clear of the active row's text (whole bird) …
  const sText = (right - (p.textRight + gap)) / (m.bird.x1 - m.bird.x0);
  // … and of the next row's text (only the tail, right of the feet, hangs there).
  const sTail = (right - (p.nextTextRight + gap)) / (m.bird.x1 - m.feetX);
  if (sText > 0) s = Math.min(s, sText);
  if (sTail > 0) s = Math.min(s, sTail);
  s = Math.max(s, T.minBirdHeight / above);

  const x = right - m.bird.x1 * s;
  const y = p.dividerY - m.lineY * s;
  return { x, y, scale: s };
}
