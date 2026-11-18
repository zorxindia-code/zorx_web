import { BIRD_REST } from "@/lib/contactMap";

/**
 * The contact map's bird interactions — shared by the site cursor (mouse) and
 * the map's tap handler (touch). All distances are fractions of the map's
 * rendered width, so the zones scale with the map at every size.
 */
export const MAP_FLIGHT = {
  /** A marker draws the bird into its circle within this distance of it. */
  zone: 0.075,
  /** …and is re-armed once the pointer has moved this far away. */
  exit: 0.12,
  /** Radius of the circle flown around a marker — clear of the pin itself. */
  orbit: 0.062,
  /** One unhurried loop around the marker (s). */
  orbitSeconds: 2.1,
  /** Touch: a tap this close to a marker (or 24 px) sends the bird round it. */
  tap: 0.09,
} as const;

/** Cursor element for the map, driven by the site cursor controller. */
export interface MapFlight {
  enter(zone: HTMLElement, x: number, y: number): void;
  move(x: number, y: number): void;
  leave(): void;
  destroy(): void;
}

const TAU = Math.PI * 2;
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t); // ease-in-out (sine)
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Map mode of the site cursor (see BirdCursor): while the mouse is over the
 * map, the map's own bird follows the pointer, facing the way it moves. Near a
 * marker it flies one loop around it — the loop's position is blended with the
 * pointer, so it eases out of and back into following, and moving well away
 * ends it at once. One element, written once per frame as a transform; the
 * frame loop runs only while the pointer is over the map.
 */
export function createMapFlight(el: HTMLElement): MapFlight {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let zone: HTMLElement | null = null;
  let rings: { id: string; el: Element }[] = [];
  const armed = new Set<string>();
  let px = 0, py = 0; // pointer
  let x = 0, y = 0; // bird
  let heading = (BIRD_REST.angle * Math.PI) / 180;
  let w = 0; // 0 = on the pointer, 1 = on the circle
  let orbit: { id: string; phi0: number; dir: number; t0: number } | null = null;
  let raf = 0;
  let last = 0;

  const centre = (ring: Element) => {
    const r = ring.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const frame = (now: number) => {
    raf = 0;
    if (!zone) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - (last || now - 16)) / 1000));
    last = now;
    const mw = zone.getBoundingClientRect().width;
    const scale = mw / 1037; // the bird at the map's own scale (the artwork is 1037 wide)

    // Arm / trigger: one loop per approach.
    for (const m of rings) {
      const c = centre(m.el);
      const d = Math.hypot(px - c.x, py - c.y);
      if (d > MAP_FLIGHT.exit * mw) armed.add(m.id);
      else if (!orbit && !reduce.matches && armed.has(m.id) && d < MAP_FLIGHT.zone * mw) {
        armed.delete(m.id);
        const vx = px - x, vy = py - y; // approach direction keeps the turn natural
        const cross = (x - c.x) * vy - (y - c.y) * vx;
        orbit = { id: m.id, phi0: Math.atan2(y - c.y, x - c.x), dir: cross >= 0 ? 1 : -1, t0: now };
      }
    }

    let tx = px, ty = py, target = 0, easeS = 0.16;
    if (orbit) {
      const ring = rings.find((m) => m.id === orbit!.id);
      const c = ring ? centre(ring.el) : { x: px, y: py };
      const t = (now - orbit.t0) / 1000 / MAP_FLIGHT.orbitSeconds;
      const away = Math.hypot(px - c.x, py - c.y) > MAP_FLIGHT.exit * mw;
      target = t < 1 && !away ? 1 : 0;
      if (away) easeS = 0.08; // leaving: back on the pointer at once
      const phi = orbit.phi0 + orbit.dir * TAU * ease(Math.min(1, t));
      tx = c.x + Math.cos(phi) * MAP_FLIGHT.orbit * mw;
      ty = c.y + Math.sin(phi) * MAP_FLIGHT.orbit * mw;
      if (!target && w < 0.01) orbit = null;
    }
    w += (target - w) * (1 - Math.exp(-dt / easeS));
    const nx = px + (tx - px) * w;
    const ny = py + (ty - py) * w;

    // Face the direction of flight (smoothed; held when still).
    const vx = (nx - x) / dt, vy = (ny - y) / dt;
    if (!reduce.matches && Math.hypot(vx, vy) > 40) {
      heading += wrap(Math.atan2(vy, vx) - heading) * (1 - Math.exp(-dt / 0.09));
    }
    x = nx;
    y = ny;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${heading}rad) scale(${scale})`;
    raf = requestAnimationFrame(frame);
  };

  return {
    enter(z, ex, ey) {
      zone = z;
      rings = Array.from(z.querySelectorAll<SVGGElement>("[data-map-marker]")).map((g) => ({
        id: g.dataset.mapMarker ?? "",
        el: g.querySelector(".zorx-map-pin-ring") ?? g,
      }));
      rings.forEach((m) => armed.add(m.id));
      px = x = ex;
      py = y = ey;
      w = 0;
      orbit = null;
      heading = (BIRD_REST.angle * Math.PI) / 180; // arrives in the map's own pose
      last = 0;
      el.dataset.visible = "true";
      if (!raf) raf = requestAnimationFrame(frame);
      frame(performance.now()); // placed before it shows: no slide-in
    },
    move(mx, my) {
      px = mx;
      py = my;
    },
    leave() {
      zone = null;
      orbit = null;
      el.dataset.visible = "false";
      cancelAnimationFrame(raf);
      raf = 0;
    },
    destroy() {
      this.leave();
    },
  };
}
