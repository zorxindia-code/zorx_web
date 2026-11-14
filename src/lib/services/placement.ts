import { SERVICES_TUNING as T, type BirdPlacement } from "@/config/services";

export interface PlacementInput {
  /** Section width (px). */
  width: number;
  /** Divider centre (px from the section top). */
  dividerY: number;
  /** Height of the row the divider belongs to. */
  rowHeight: number;
  /** Left / right edges of the active row's text. */
  textLeft: number;
  textRight: number;
  /** Left / right edges of the next row's text (the tail hangs into that row). */
  nextTextLeft: number;
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
 *  - resting bird against the section margin on its side (left or right)
 *  - shrinks if needed so it never overlaps the active row's text, and the part
 *    hanging below the line stays clear of the next row's text
 *  - the video's outer edge stays beyond the section, so the bird enters and
 *    leaves from off-screen on its side
 */
export function placeBird(
  m: BirdPlacement,
  p: PlacementInput,
  side: "left" | "right",
  size = 1,
): Placement {
  const margin = Math.max(16, p.width * 0.05);
  const gap = Math.max(12, p.width * 0.025);
  const above = m.lineY - m.bird.y0; // resting height above the perch line
  const tail = m.tail ?? { x0: m.feetX, x1: m.bird.x1 };
  const bw = m.bird.x1 - m.bird.x0;

  let s = (p.rowHeight * T.birdHeightOfRow * size) / above;
  let sText: number;
  let sTail: number;
  if (side === "right") {
    const right = p.width - margin;
    sText = (right - (p.textRight + gap)) / bw;
    sTail = (right - (p.nextTextRight + gap)) / (m.bird.x1 - tail.x0);
  } else {
    const left = margin;
    sText = (p.textLeft - gap - left) / bw;
    sTail = (p.nextTextLeft - gap - left) / (tail.x1 - m.bird.x0);
  }
  if (sText > 0) s = Math.min(s, sText);
  if (sTail > 0) s = Math.min(s, sTail);
  s = Math.max(s, T.minBirdHeight / above);

  const x = side === "right" ? p.width - margin - m.bird.x1 * s : margin - m.bird.x0 * s;
  const y = p.dividerY - m.lineY * s;
  return { x, y, scale: s };
}
