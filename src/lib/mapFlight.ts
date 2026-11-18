import { gsap } from "gsap";
import { MAP_INTERACTION_TUNING as T } from "@/config/mapInteraction";
import { BIRD_REST, MAP_H, MAP_MARKERS, MAP_W } from "@/lib/contactMap";
import { spotlight, type OfficeId } from "@/lib/officeSpotlight";

/**
 * THE contact-map bird — one bird, whoever draws it.
 *
 * Its flight (position, velocity, heading, banking, state) lives here, in the
 * map's own units (the artwork's 1037 × 780 viewBox), and is drawn by exactly
 * one of two elements at a time:
 *   cursor — the site cursor's map bird (BirdCursor), while the mouse is over
 *            the map: the bird flies after the pointer
 *   auto   — the bird inside the map (MapMotion), while the cursor is NOT on
 *            the map but an office is the goal (an office column hovered /
 *            focused, a pin selected — and every touch interaction)
 * Ownership passes at the bird's current position, so it is never duplicated
 * and never jumps.
 *
 * States: idle → free-flight → approaching → spiral-orbit → stable-orbit, and
 * departing back to free flight. Near a pin (entry radius; released beyond the
 * exit radius) the bird is drawn into a spiral around it that starts where the
 * bird is, turns the way it is already flying, tightens over `spiralDuration`
 * and then circles on, stable, for as long as the pin stays its goal.
 *
 * Pointer → map units through the SVG's screen matrix every frame (right under
 * Lenis scrolling and any resize); the pins' artwork coordinates are the only
 * source of truth. The loop rides GSAP's ticker — the frame Lenis scrolls on —
 * added after Lenis, so each frame reads the map's position AFTER this frame's
 * scroll (no one-frame lag, no orbit wobble while scrolling); it runs only while
 * the bird is drawn, the map is on screen and the tab visible; time-based, with
 * capped steps. It sleeps once the
 * cursor's bird has settled on a resting pointer and wakes on pointer moves,
 * scrolling (Lenis drives the native scroll) and resizes.
 */
export type MapBirdState = "idle" | "free-flight" | "approaching" | "spiral-orbit" | "stable-orbit" | "departing";

/** Kept for the site cursor (BirdCursor): its map mode. */
export interface MapFlight {
  enter(zone: HTMLElement, x: number, y: number): void;
  move(x: number, y: number): void;
  leave(): void;
  destroy(): void;
}

export interface MapContext {
  container: HTMLElement;
  svg: SVGSVGElement;
  auto: HTMLElement;
  trail: SVGPolylineElement | null;
  debug: SVGGElement | null;
}

const TAU = Math.PI * 2;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const U = (f: number) => f * MAP_W; // fraction of the map width → map units
const PINS = MAP_MARKERS as Record<OfficeId, { x: number; y: number }>;
const IDS = Object.keys(PINS) as OfficeId[];

const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------ state
let ctx: MapContext | null = null;
let onScreen = true;
let cursorEl: HTMLElement | null = null;
let owner: "cursor" | "auto" | null = null;
let fading = 0; // auto bird leaving (s left), or 0
let client: { x: number; y: number } | null = null; // the real pointer (viewport px)
const bird = { x: 0, y: 0, vx: 0, vy: 0, heading: (BIRD_REST.angle * Math.PI) / 180, bank: 0, known: false };
let orbit: { id: OfficeId; theta: number; dir: number; r0: number; t: number } | null = null;
let w = 0; // 0 = following its target, 1 = on the circle
let near: OfficeId | null = null; // cursor proximity (hysteresis)
let state: MapBirdState = "idle";
let want = false; // another frame wanted
let ticking = false; // on the GSAP ticker
let last = 0;
let mapPx = 0; // the map's rendered width (ResizeObserver), for the autonomous bird
let resize: ResizeObserver | null = null;
const trail: { x: number; y: number; t: number }[] = [];

const ctm = () => ctx?.svg.getScreenCTM() ?? null;
const toMap = (px: number, py: number, m: DOMMatrix) => {
  const inv = m.inverse();
  return { x: inv.a * px + inv.c * py + inv.e, y: inv.b * px + inv.d * py + inv.f };
};
const goalNow = (): OfficeId | null => (owner === "cursor" ? near : spotlight.goal);

// ------------------------------------------------------------------ frame
function frame(now: number) {
  want = false;
  if (!ctx || !owner || !onScreen || document.hidden) return;
  const dt = Math.min(0.05, Math.max(0.001, (now - (last || now - 16)) / 1000));
  last = now;
  const m = ctm();
  if (!m) return schedule();
  const still = reduce();

  // ----- the pointer, and which pin draws the bird (entry / exit hysteresis)
  let follow: { x: number; y: number } | null = null;
  if (owner === "cursor" && client) {
    follow = toMap(client.x, client.y, m);
    if (near && Math.hypot(follow.x - PINS[near].x, follow.y - PINS[near].y) > U(T.exitRadius)) near = null;
    if (!near) {
      let best: OfficeId | null = null;
      let bd = U(T.entryRadius);
      for (const id of IDS) {
        const d = Math.hypot(follow.x - PINS[id].x, follow.y - PINS[id].y);
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
      near = best;
    }
    spotlight.set("proximity", near);
  }
  const goal = goalNow();

  // ----- orbit: join / tighten / leave
  let joinTau: number = T.joinSmoothing;
  if (goal && !still) {
    if (orbit && orbit.id !== goal) {
      // the other pin: break away first, take up the new circle from free flight
      if (w < 0.15) orbit = null;
      else joinTau = T.leaveSmoothing;
    }
    if (!orbit) {
      const c = PINS[goal];
      const dx = bird.x - c.x, dy = bird.y - c.y, dist = Math.hypot(dx, dy) || 1;
      // turn the way the bird is already flying: sign of (radius × velocity)
      const dir = dx * bird.vy - dy * bird.vx >= 0 ? 1 : -1;
      const r0 = Math.min(U(T.initialOrbitRadius), Math.max(U(T.finalOrbitRadius), dist));
      orbit = { id: goal, theta: Math.atan2(dy, dx), dir, r0, t: 0 };
    }
  } else if (orbit && w < 0.02) orbit = null;

  // reduced motion: the map's bird simply rests beside the active pin, facing it
  if (still && owner === "auto" && goal) {
    const c = PINS[goal], r = U(T.finalOrbitRadius);
    bird.x = c.x - r * 0.75;
    bird.y = c.y - r * 0.66;
    bird.vx = bird.vy = 0;
    bird.heading = Math.atan2(c.y - bird.y, c.x - bird.x);
  }

  let target = follow ?? { x: bird.x, y: bird.y };
  let wGoal = 0;
  if (orbit) {
    const c = PINS[orbit.id];
    const on = goal === orbit.id && !still;
    wGoal = on ? 1 : 0;
    if (!on) joinTau = T.leaveSmoothing;
    orbit.t += dt;
    const k = easeOut(Math.min(1, orbit.t / T.spiralDuration));
    // constant angular speed: the circle never speeds up as it tightens
    const omega = TAU * T.orbitRevsPerSecond;
    orbit.theta = wrap(orbit.theta + orbit.dir * omega * dt);
    // the bird trails its point on the circle (smoothing τ) and so flies a smaller
    // circle, by 1/√(1+(ωτ)²) — aim wider by that much, so it flies the true radius
    const r = (orbit.r0 + (U(T.finalOrbitRadius) - orbit.r0) * k) * Math.sqrt(1 + (omega * T.orbitSmoothing) ** 2);
    const o = { x: c.x + Math.cos(orbit.theta) * r, y: c.y + Math.sin(orbit.theta) * r };
    if (owner === "auto") target = o; // no pointer to blend with: it is the circle
    else if (follow) target = { x: follow.x + (o.x - follow.x) * w, y: follow.y + (o.y - follow.y) * w };
    state = !on ? "departing" : w < 0.6 ? "approaching" : orbit.t < T.spiralDuration ? "spiral-orbit" : "stable-orbit";
  } else state = owner === "auto" && !goal ? "idle" : "free-flight";
  w += (wGoal - w) * approach(dt, joinTau);

  // ----- move: frame-rate independent, with a top speed (a mouse flick → a glide)
  const tau = orbit && w > 0.5 ? T.orbitSmoothing : T.positionSmoothing;
  let nx = bird.x + (target.x - bird.x) * approach(dt, tau);
  let ny = bird.y + (target.y - bird.y) * approach(dt, tau);
  const step = Math.hypot(nx - bird.x, ny - bird.y);
  const cap = U(owner === "auto" ? T.maxSpeed : T.maxCursorSpeed) * dt;
  if (step > cap) {
    nx = bird.x + ((nx - bird.x) / step) * cap;
    ny = bird.y + ((ny - bird.y) / step) * cap;
  }
  bird.vx = (nx - bird.x) / dt;
  bird.vy = (ny - bird.y) / dt;
  bird.x = nx;
  bird.y = ny;

  // ----- face the way it flies: shortest turn, smoothed, rate-capped; bank into turns
  let turn = 0;
  if (!still && Math.hypot(bird.vx, bird.vy) > U(0.03)) {
    const diff = wrap(Math.atan2(bird.vy, bird.vx) - bird.heading);
    turn = diff * approach(dt, T.rotationSmoothing);
    const maxTurn = T.maxTurnRate * dt;
    turn = Math.max(-maxTurn, Math.min(maxTurn, turn));
    bird.heading = wrap(bird.heading + turn);
  }
  const bankGoal = Math.max(-1, Math.min(1, turn / dt / 6));
  bird.bank += (bankGoal - bird.bank) * approach(dt, 0.15);

  // ----- optional trail
  if (T.enableFlightTrail && ctx.trail && !still) {
    trail.push({ x: bird.x, y: bird.y, t: now });
    while (trail.length && now - trail[0].t > T.flightTrailLifetime * 1000) trail.shift();
    ctx.trail.setAttribute("points", trail.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
  }

  // ----- the autonomous bird leaves when its goal is gone
  if (owner === "auto" && !goal) {
    fading = fading || 0.45;
    fading = Math.max(0, fading - dt);
    ctx.auto.style.opacity = String(fading / 0.45);
    if (fading <= 0) return release();
  } else if (owner === "auto") {
    fading = 0;
    ctx.auto.style.opacity = "1";
  }

  render(m);
  // settled on a resting pointer (no circle, no motion left): sleep until the
  // pointer moves, the page scrolls or the map resizes
  const settled =
    owner === "cursor" && !orbit && w < 0.01 && Math.abs(bird.bank) < 0.005 &&
    Math.hypot(target.x - bird.x, target.y - bird.y) < 0.25 && Math.hypot(bird.vx, bird.vy) < 1;
  if (!settled) schedule();
}

function render(m: DOMMatrix) {
  if (!ctx) return;
  const wings = 1 - T.bank * Math.abs(bird.bank);
  if (owner === "cursor" && cursorEl) {
    const s = m.a; // px per map unit: the bird at the map's own scale
    const px = m.a * bird.x + m.c * bird.y + m.e, py = m.b * bird.x + m.d * bird.y + m.f;
    cursorEl.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${bird.heading}rad) scale(${s}, ${s * wings})`;
  } else if (owner === "auto") {
    const s = (mapPx || ctx.container.clientWidth) / MAP_W;
    ctx.auto.style.transform = `translate3d(${bird.x * s}px, ${bird.y * s}px, 0) rotate(${bird.heading}rad) scale(${s}, ${s * wings})`;
  }
  if (ctx.debug) {
    const r = orbit ? Math.hypot(bird.x - PINS[orbit.id].x, bird.y - PINS[orbit.id].y) : 0;
    const ring = ctx.debug.querySelector("[data-debug-orbit]");
    ring?.setAttribute("cx", String(orbit ? PINS[orbit.id].x : -999));
    ring?.setAttribute("cy", String(orbit ? PINS[orbit.id].y : -999));
    ring?.setAttribute("r", String(r));
    const text = ctx.debug.querySelector("[data-debug-text]");
    if (text) text.textContent = `${state} · ${owner} · active ${spotlight.active ?? "–"} · r ${r.toFixed(0)}`;
  }
}

function schedule() {
  if (!owner || !onScreen || document.hidden) return;
  want = true;
  if (!ticking) {
    ticking = true;
    gsap.ticker.add(tick); // appended: runs after Lenis's step
  }
}
function tick() {
  frame(performance.now());
  if (!want && ticking) {
    gsap.ticker.remove(tick);
    ticking = false;
  }
}
/** Wake a sleeping loop without a time jump. */
function wake() {
  if (want || !owner) return;
  last = 0;
  schedule();
}

function show(next: "cursor" | "auto" | null) {
  // cursor ⇄ map bird: an instant swap (a fade would show both, or neither)
  const handoff = (owner === "auto" && next === "cursor") || (owner === "cursor" && next === "auto");
  if (handoff && cursorEl) {
    const el = cursorEl, glyph = el.firstElementChild as HTMLElement | null;
    el.style.transition = "none";
    if (glyph) glyph.style.transition = "none";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.removeProperty("transition");
      glyph?.style.removeProperty("transition");
    }));
  }
  owner = next;
  if (cursorEl) cursorEl.dataset.visible = String(next === "cursor");
  if (ctx) {
    ctx.auto.dataset.visible = String(next === "auto");
    if (next === "auto") ctx.auto.style.opacity = "1";
  }
  last = 0;
  schedule();
}

function release() {
  owner = null;
  orbit = null;
  w = 0;
  state = "idle";
  if (ctx) ctx.auto.dataset.visible = "false";
  trail.length = 0;
  ctx?.trail?.setAttribute("points", "");
}

/** The autonomous bird enters from the office columns' side (the left). */
function startAuto(goal: OfficeId) {
  if (!bird.known) {
    const c = PINS[goal];
    bird.x = -U(0.06);
    bird.y = c.y - U(0.12);
    bird.vx = U(0.5);
    bird.vy = 0;
    bird.heading = 0;
    bird.known = true;
  }
  orbit = null;
  w = 0;
  fading = 0;
  show("auto");
}

// The goal changes while the cursor is not on the map: the map's bird takes over.
spotlight.subscribe(() => {
  if (owner === "cursor" || !ctx) return;
  const g = spotlight.goal;
  if (g && owner !== "auto") startAuto(g);
  else schedule();
});

// ------------------------------------------------------------------ API
export const mapBird = {
  /** MapMotion: the map, its own bird element and the optional trail / debug layers. */
  attach(c: MapContext) {
    ctx = c;
    mapPx = c.container.clientWidth;
    resize = new ResizeObserver(() => {
      mapPx = c.container.clientWidth; // once per resize, not per frame
      wake();
    });
    resize.observe(c.container);
    window.addEventListener("scroll", wake, { passive: true });
    if (spotlight.goal && owner !== "cursor") startAuto(spotlight.goal);
  },
  detach(c: MapContext) {
    if (ctx !== c) return;
    if (owner === "auto") release();
    resize?.disconnect();
    resize = null;
    window.removeEventListener("scroll", wake);
    ctx = null;
    gsap.ticker.remove(tick);
    ticking = want = false;
  },
  /** MapMotion: the loop runs only while the map is on screen (and the tab visible). */
  setOnScreen(v: boolean) {
    onScreen = v;
    last = 0;
    schedule();
  },
  resume() {
    last = 0;
    schedule();
  },
  get state() {
    return state;
  },
  /** The bird in map units (tests / debug). */
  get position() {
    return { x: bird.x, y: bird.y, heading: bird.heading, owner, state };
  },
};

/**
 * The site cursor's map mode (BirdCursor) — the same API as before (enter the
 * map, move, leave), now handing the one bird between the cursor and the map.
 */
export function createMapFlight(el: HTMLElement): MapFlight {
  cursorEl = el;
  return {
    enter(_zone, x, y) {
      client = { x, y };
      const m = ctm();
      if (owner !== "auto" && m) {
        // nothing flying: the bird appears under the pointer (no slide-in)
        Object.assign(bird, toMap(x, y, m));
        bird.vx = bird.vy = 0;
        bird.known = true;
      }
      // else the map's own bird was flying: the cursor takes it over where it is
      near = null;
      show("cursor");
      if (m) render(m);
    },
    move(x, y) {
      client = { x, y };
      if (owner === "cursor") wake();
    },
    leave() {
      if (owner !== "cursor") return;
      client = null;
      near = null;
      spotlight.set("proximity", null);
      if (spotlight.goal && ctx) {
        orbit = null;
        w = 0;
        show("auto"); // the map's bird carries on to the goal, from here
      } else {
        show(null);
        release();
      }
    },
    destroy() {
      this.leave();
      if (cursorEl === el) cursorEl = null;
    },
  };
}

/** Pins (map units) and the map's size — for MapMotion. */
export const MAP_PINS = PINS;
export const MAP_SIZE = { w: MAP_W, h: MAP_H };
