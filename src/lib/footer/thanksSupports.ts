/**
 * Invisible collision supports for the THANKS footer (hand-authored; the
 * letters themselves are generated — thanksScene.ts). Same scene units as the
 * traced artwork (1252 × 476), so they scale with it.
 *
 * The letters stay the landing surfaces (the H's upper cavity, the A's slope,
 * the N's and K's upper diagonals, the S's curve). These convex plugs only close
 * the passages that lead DOWN — the slits between letters and at the page
 * edges, through which an object could reach the space under the letters or the
 * cropped bottom of the page. Each plug's top sits a little below the letter
 * tops (a shallow notch, not a flat lid), and each runs on below the crop, thick,
 * so nothing tunnels through. Overlapping a letter is harmless (both are static).
 *
 * Together, letters + plugs make the playable "ground": every point above it is
 * open from above; everything below it is solid or sealed (see `groundAt` in
 * gravityWorld.ts).
 */
export const SUPPORTS: readonly { id: string; points: readonly (readonly [number, number])[] }[] = [
  // left page edge ↔ T's arm (a 10-unit slit down to the space under the arm)
  { id: "edge-T", points: [[-20, 262], [12, 262], [12, 500], [-20, 500]] },
  // T's arm tip ↔ H's left stem
  { id: "T-H", points: [[190, 262], [228, 262], [228, 500], [190, 500]] },
  // H's right stem ↔ the A's left tip, and the hollow under the A's left leg
  { id: "H-A", points: [[400, 290], [421.7, 303.4], [521.2, 439.6], [521.2, 500], [400, 500]] },
  // the A's right corner ↔ N's left stem (the A leans on N with a 1.2 gap)
  { id: "A-N", points: [[669, 262], [674, 262], [674, 500], [560, 500]] },
  // N's right stem ↔ K's stem — the deep 48-unit gap
  { id: "N-K", points: [[850, 266], [902, 266], [902, 500], [850, 500]] },
  // K's arm tip ↔ S: seals the K's mouth and the S's lower-left pocket
  { id: "K-S", points: [[1079, 252], [1114, 258], [1114, 500], [1079, 500]] },
  // S ↔ right page edge (and the S's upper-right pocket)
  { id: "S-edge", points: [[1236, 268], [1272, 268], [1272, 500], [1236, 500]] },
];
