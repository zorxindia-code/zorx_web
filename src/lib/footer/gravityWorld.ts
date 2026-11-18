import type MatterNS from "matter-js";
import { GRAVITY_TUNING as T } from "@/config/socials";
import { LETTERS, SCENE_W, START, TARGET, VIEW_H } from "@/lib/footer/thanksScene";

type Matter = typeof MatterNS;
type Body = MatterNS.Body;

/** One falling object: a disc (social icon) or a capsule (greeting). */
export interface GravityObject {
  id: string;
  kind: "disc" | "capsule";
  el: HTMLElement;
  /** Scene-unit size (disc: r; capsule: w × h). */
  r?: number;
  w?: number;
  h?: number;
}

const CAT = { wall: 0x1, letter: 0x2, obj: 0x4 } as const;
const STEP = 1000 / 120; // fixed sub-step (ms): thin surfaces never tunnel
const MAX_STEPS = 6;

/**
 * The THANKS footer's local physics world (Matter.js). Scene units are the
 * reference artwork's pixels (1252 × 476); the DOM is drawn at `scale` px per
 * unit. The letters are static compound bodies built from the traced convex
 * parts — the same shapes as the drawn outlines. The objects are created only
 * on release, at exactly their designed positions, so there is no jump.
 *
 * Release → a guided first landing (soft springs toward the designed resting
 * spots, greetings that start inside a letter pass through letters until they
 * are clear), then the guides are removed and everything is left asleep where
 * it landed. From then on it is free physics: knocks from the pointer, drag and
 * throw. The loop runs only while the footer is on screen.
 */
export function createGravityWorld(M: Matter, objects: GravityObject[], onFrame?: () => void) {
  const engine = M.Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8, constraintIterations: 4 });
  engine.gravity.x = T.gravityX;
  engine.gravity.y = T.gravityY;
  const world = engine.world;

  // ---------------------------------------------------------------- static scene
  const letterBodies = LETTERS.map((L) =>
    M.Body.create({
      isStatic: true,
      friction: T.friction,
      collisionFilter: { category: CAT.letter, mask: CAT.obj },
      parts: L.parts.map((flat) => {
        const verts = [];
        for (let i = 0; i < flat.length; i += 2) verts.push({ x: flat[i], y: flat[i + 1] });
        const c = M.Vertices.centre(verts);
        return M.Bodies.fromVertices(c.x, c.y, [verts], { isStatic: true });
      }),
    }),
  );
  const letterParts = letterBodies.flatMap((b) => b.parts.slice(1));
  const wall = (x: number, y: number, w: number, h: number) =>
    M.Bodies.rectangle(x, y, w, h, { isStatic: true, friction: T.friction, collisionFilter: { category: CAT.wall, mask: CAT.obj } });
  const t = 400; // thick walls: nothing escapes at speed
  M.Composite.add(world, [
    ...letterBodies,
    // floor on the page's last line (the crop): nothing falls out of sight; the
    // letters' bodies continue below it, complete, as the drawn letters do
    wall(SCENE_W / 2, VIEW_H + t / 2, SCENE_W + 2 * t, t),
    wall(-t / 2, VIEW_H / 2, t, VIEW_H + 2 * t),
    wall(SCENE_W + t / 2, VIEW_H / 2, t, VIEW_H + 2 * t),
    wall(SCENE_W / 2, -t / 2, SCENE_W + 2 * t, t), // ceiling: stays inside the footer
  ]);

  // ---------------------------------------------------------------- objects
  const items = objects.map((o) => ({ ...o, body: null as Body | null, last: "" }));
  let scale = 1;
  let released = false;
  let guides: { body: Body; c: MatterNS.Constraint; angle: number; ghost: boolean }[] = [];
  let guideT = 0;

  const material = (ghost: boolean) => ({
    restitution: T.restitution,
    friction: T.friction,
    frictionStatic: 0.9,
    frictionAir: T.frictionAir,
    density: 0.0016,
    sleepThreshold: 40,
    collisionFilter: { category: CAT.obj, mask: CAT.wall | CAT.obj | (ghost ? 0 : CAT.letter) },
  });
  const overlapsLetters = (b: Body) => M.Query.collides(b, letterParts).length > 0;

  function release() {
    if (released) return;
    released = true;
    for (const it of items) {
      const s = START[it.id];
      const probe =
        it.kind === "disc"
          ? M.Bodies.circle(s.x, s.y, it.r!, material(false))
          : M.Bodies.rectangle(s.x, s.y, it.w!, it.h!, { ...material(false), chamfer: { radius: it.h! / 2 - 0.5 } });
      // A greeting designed on top of a letter starts as a "ghost" to the letters
      // (no explosive separation), solid again the moment it is clear of them.
      const ghost = overlapsLetters(probe);
      if (ghost) probe.collisionFilter.mask = CAT.wall | CAT.obj;
      it.body = probe;
      const tg = TARGET[it.id];
      const c = M.Constraint.create({ pointA: { x: tg.x, y: tg.y }, bodyB: probe, length: 0, stiffness: 0, damping: 0.12 });
      guides.push({ body: probe, c, angle: (tg.angle * Math.PI) / 180, ghost });
      M.Composite.add(world, [probe, c]);
    }
    guideT = 0;
  }

  /** Soft landing guide: springs ease in, angles turn toward the design, then all is let go. */
  function guide(dt: number) {
    if (!guides.length) return;
    guideT += dt / 1000;
    const k = Math.min(1, guideT / 0.9);
    for (const g of guides) {
      g.c.stiffness = 0.0035 * k * k;
      const da = Math.atan2(Math.sin(g.angle - g.body.angle), Math.cos(g.angle - g.body.angle));
      M.Body.setAngularVelocity(g.body, g.body.angularVelocity * 0.9 + da * 0.012 * k);
      if (g.ghost && !overlapsLetters(g.body)) {
        g.ghost = false;
        g.body.collisionFilter.mask = CAT.wall | CAT.obj | CAT.letter;
      }
    }
    if (guideT >= T.landingSeconds) {
      for (const g of guides) {
        M.Composite.remove(world, g.c);
        g.body.collisionFilter.mask = CAT.wall | CAT.obj | CAT.letter;
        M.Body.setVelocity(g.body, { x: 0, y: 0 });
        M.Body.setAngularVelocity(g.body, 0);
        M.Sleeping.set(g.body, true); // rests where it landed until something touches it
      }
      guides = [];
    }
  }

  // ---------------------------------------------------------------- rendering
  function render(force = false) {
    for (const it of items) {
      const b = it.body;
      const x = b ? b.position.x : START[it.id].x, y = b ? b.position.y : START[it.id].y, a = b ? b.angle : 0;
      const key = `${x.toFixed(2)},${y.toFixed(2)},${a.toFixed(4)},${scale}`;
      if (!force && key === it.last) continue;
      it.last = key;
      it.el.style.transform = `translate3d(${(x * scale).toFixed(2)}px, ${(y * scale).toFixed(2)}px, 0) translate(-50%, -50%) rotate(${a.toFixed(4)}rad)`;
    }
    onFrame?.();
  }

  // ---------------------------------------------------------------- loop
  let raf = 0, last = 0, acc = 0, running = false;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(100, now - (last || now));
    last = now;
    if (!released) return;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < MAX_STEPS) {
      guide(STEP);
      M.Engine.update(engine, STEP);
      acc -= STEP;
      n++;
    }
    if (n === MAX_STEPS) acc = 0; // never spiral after a long frame
    render();
  };

  // ---------------------------------------------------------------- pointer
  const dragging = new Map<number, { body: Body; c: MatterNS.Constraint; samples: { x: number; y: number; t: number }[] }>();
  const knockedAt = new WeakMap<Body, number>();
  const toLocal = (b: Body, p: { x: number; y: number }) => {
    const dx = p.x - b.position.x, dy = p.y - b.position.y, c = Math.cos(-b.angle), s = Math.sin(-b.angle);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  };
  /** Distance from a point to an object's surface (negative inside). */
  const surfaceDistance = (it: (typeof items)[number], p: { x: number; y: number }) => {
    const b = it.body!;
    if (it.kind === "disc") return Math.hypot(p.x - b.position.x, p.y - b.position.y) - it.r!;
    const l = toLocal(b, p), half = Math.max(0, it.w! / 2 - it.h! / 2);
    return Math.hypot(Math.max(0, Math.abs(l.x) - half), l.y) - it.h! / 2;
  };

  return {
    engine,
    release,
    get released() {
      return released;
    },
    /** px per scene unit; object sizes in units (they may grow on small screens). */
    setScale(s: number, sizes: Record<string, { r?: number; w?: number; h?: number }>) {
      scale = s;
      for (const it of items) {
        const z = sizes[it.id];
        const k = it.kind === "disc" ? z.r! / it.r! : z.h! / it.h!;
        if (it.body && Math.abs(k - 1) > 0.01) {
          M.Body.scale(it.body, k, k);
          M.Sleeping.set(it.body, false);
        }
        Object.assign(it, z);
      }
      render(true);
    },
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    render,
    /** Grab an object (pointer down on it). p in scene units. */
    grab(pointerId: number, id: string, p: { x: number; y: number }, t: number) {
      const it = items.find((i) => i.id === id);
      const b = it?.body;
      if (!b || guides.length) return false;
      M.Sleeping.set(b, false);
      const c = M.Constraint.create({ pointA: { ...p }, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, length: 0, stiffness: 0.2, damping: 0.1 });
      M.Composite.add(world, c);
      dragging.set(pointerId, { body: b, c, samples: [{ ...p, t }] });
      return true;
    },
    drag(pointerId: number, p: { x: number; y: number }, t: number) {
      const d = dragging.get(pointerId);
      if (!d) return;
      d.c.pointA = { ...p };
      d.samples.push({ ...p, t });
      if (d.samples.length > 6) d.samples.shift();
      M.Sleeping.set(d.body, false);
    },
    /** Let go: the object keeps the pointer's momentum (throw). */
    drop(pointerId: number) {
      const d = dragging.get(pointerId);
      if (!d) return;
      M.Composite.remove(world, d.c);
      dragging.delete(pointerId);
      const s = d.samples, a = s[0], z = s[s.length - 1], dt = z.t - a.t;
      if (dt > 0 && dt < 160) {
        const k = STEP * 2; // units per ms → units per 16.7 ms step (Matter's velocity unit)
        const v = { x: ((z.x - a.x) / dt) * k * 0.5, y: ((z.y - a.y) / dt) * k * 0.5 };
        const m = Math.hypot(v.x, v.y), cap = T.maxImpact * 1.6;
        M.Body.setVelocity(d.body, m > cap ? { x: (v.x / m) * cap, y: (v.y / m) * cap } : v);
      }
    },
    /** Pointer sweeping across the scene (not dragging): knock what it hits. */
    sweep(from: { x: number; y: number }, to: { x: number; y: number }, dtMs: number, now: number) {
      if (!released || guides.length || dtMs <= 0) return;
      const vx = (to.x - from.x) / dtMs, vy = (to.y - from.y) / dtMs; // units per ms
      const speed = Math.hypot(vx, vy);
      if (speed < 0.03) return; // resting / creeping pointer: never pushes (stays clickable)
      const len = Math.hypot(to.x - from.x, to.y - from.y), n = Math.max(1, Math.ceil(len / 6));
      for (const it of items) {
        const b = it.body;
        if (!b || [...dragging.values()].some((d) => d.body === b)) continue;
        if (now - (knockedAt.get(b) ?? -1e9) < 90) continue;
        let hit: { x: number; y: number } | null = null;
        for (let i = 0; i <= n && !hit; i++) {
          const p = { x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n };
          if (surfaceDistance(it, p) < 4) hit = p;
        }
        if (!hit) continue;
        knockedAt.set(b, now);
        M.Sleeping.set(b, false);
        const k = STEP * 2 * 0.55 * T.impact;
        let dv = { x: vx * k, y: vy * k };
        const m = Math.hypot(dv.x, dv.y);
        if (m > T.maxImpact) dv = { x: (dv.x / m) * T.maxImpact, y: (dv.y / m) * T.maxImpact };
        M.Body.setVelocity(b, { x: b.velocity.x + dv.x, y: b.velocity.y + dv.y });
        // off-centre hits spin it
        const r = { x: hit.x - b.position.x, y: hit.y - b.position.y };
        const R = it.kind === "disc" ? it.r! : it.w! / 2;
        const spin = Math.max(-0.25, Math.min(0.25, ((r.x * dv.y - r.y * dv.x) / (R * R)) * 0.5));
        M.Body.setAngularVelocity(b, b.angularVelocity + spin);
      }
    },
    destroy() {
      this.stop();
      M.World.clear(world, false);
      M.Engine.clear(engine);
      dragging.clear();
      guides = [];
    },
  };
}

export type GravityWorld = ReturnType<typeof createGravityWorld>;
