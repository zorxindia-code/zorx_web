import type { BirdGrip } from "@/config/services";

type Role = "enter" | "exit";

/**
 * Drives one bird's grip line (see BirdGrip) from its videos' actual frames:
 * per frame, the line's opacity (fading in as the bird comes down onto its
 * spot, out once its feet have left) and its cut-outs (exactly where the toes
 * cross it). Synced with requestVideoFrameCallback — the frame being shown —
 * falling back to animation frames + currentTime. Only writes when the frame
 * changes; masks are built once.
 */
export function createGrip(el: HTMLElement, grip: BirdGrip) {
  const [s0, s1] = grip.span;
  const at = (x: number) => `${(((x - s0) / (s1 - s0)) * 100).toFixed(3)}%`;
  const toMask = (gaps: readonly (readonly number[])[]) => {
    if (!gaps.length) return "none";
    const stops = ["#000 0%"];
    for (const [a, b] of gaps) stops.push(`#000 ${at(a)}`, `transparent ${at(a)}`, `transparent ${at(b)}`, `#000 ${at(b)}`);
    stops.push("#000 100%");
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  };
  const masks = { enter: grip.enter.gaps.map(toMask), exit: grip.exit.gaps.map(toMask) };
  const alpha = (role: Role, f: number) => {
    const [a, b] = grip[role].fade;
    const t = Math.min(1, Math.max(0, (f - a) / (b - a)));
    return role === "enter" ? t : 1 - t;
  };

  let shown = "";
  let token = 0;
  const show = (role: Role, frame: number) => {
    const n = masks[role].length;
    const f = Math.min(n - 1, Math.max(0, frame));
    const key = `${role}${f}`;
    if (key === shown) return;
    shown = key;
    const o = alpha(role, f);
    el.style.opacity = String(o);
    el.style.visibility = o > 0 ? "visible" : "hidden";
    el.style.setProperty("-webkit-mask-image", masks[role][f]);
    el.style.setProperty("mask-image", masks[role][f]);
  };
  const frameOf = (t: number) => Math.floor(t * grip.fps + 1e-3);

  return {
    /** Follow a playing clip frame by frame until it pauses or ends. */
    follow(v: HTMLVideoElement, role: Role) {
      const my = ++token;
      const rvfc = (v as Partial<Pick<HTMLVideoElement, "requestVideoFrameCallback">>).requestVideoFrameCallback;
      const tick = (t: number) => {
        if (my !== token) return;
        show(role, frameOf(t));
        if (v.paused || v.ended) return;
        if (rvfc) rvfc.call(v, (_now, meta) => tick(meta.mediaTime));
        else requestAnimationFrame(() => tick(v.currentTime));
      };
      tick(v.currentTime);
      // rVFC stops with the last painted frame; make sure the clip's end state lands.
      v.addEventListener("ended", () => my === token && show(role, masks[role].length - 1), { once: true });
    },
    /** A fixed frame (reduced motion / perched). */
    hold(role: Role, frame: number) {
      token++;
      show(role, frame);
    },
    last(role: Role) {
      return masks[role].length - 1;
    },
    hide() {
      token++;
      shown = "";
      el.style.opacity = "0";
      el.style.visibility = "hidden";
    },
  };
}
