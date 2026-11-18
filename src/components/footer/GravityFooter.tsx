"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { servicesFont } from "@/components/services/font";
import { GREETINGS, GRAVITY_TUNING as T, SOCIALS, type SocialId } from "@/config/socials";
import { createGravityWorld, type GravityObject, type GravityWorld } from "@/lib/footer/gravityWorld";
import { ICON_R, LABEL_SIZE, LETTERS, SCENE_H, SCENE_W, START, TARGET } from "@/lib/footer/thanksScene";
import "./GravityFooter.css";

/** Social glyphs (standard marks), drawn in a 24 × 24 box in the icon's `fg` colour. */
const GLYPHS: Record<SocialId, ReactNode> = {
  whatsapp: (
    <>
      <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.2 7.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.3.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.3 0-.4.1-.5l.4-.5.3-.5v-.5l-.8-1.8Z" fill="currentColor" />
    </>
  ),
  linkedin: (
    <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68Z" fill="currentColor" />
  ),
  instagram: (
    <>
      <rect x="3.3" y="3.3" width="17.4" height="17.4" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.25" fill="currentColor" />
    </>
  ),
  x: <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" fill="currentColor" />,
  facebook: (
    <path d="M13.4 21.5v-8h2.7l.4-3.1h-3.1V8.4c0-.9.25-1.5 1.55-1.5h1.65V4.1c-.29-.04-1.27-.12-2.41-.12-2.38 0-4.01 1.45-4.01 4.12v2.3H7.5v3.1h2.68v8h3.22Z" fill="currentColor" />
  ),
};

/** Scene → CSS: the designed spot of an object, as % of the stage. */
const at = (id: string): CSSProperties => ({ left: `${(START[id].x / SCENE_W) * 100}%`, top: `${(START[id].y / SCENE_H) * 100}%` });

/**
 * The THANKS footer: five social icons above the outlined THANKS, with four
 * "thank you" greetings. When the bottom of the screen reaches the icon row,
 * gravity takes over (Matter.js — lib/footer/gravityWorld.ts): everything falls
 * onto the letters, which are solid (traced to their exact shapes, the custom A
 * included), and settles near the designed landing; then it is all physical —
 * knock things with the cursor, grab, drag and throw them. Social icons stay
 * links (a drag never opens them). Everything is real HTML moved by CSS
 * transforms; there is no canvas. Reduced motion: the landed composition, still.
 * Without JS (or if the physics fails to load): the designed composition.
 */
export default function GravityFooter() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current!;
    const row = stage.querySelector<HTMLElement>(".zorx-gravity-row")!;
    const els = Array.from(stage.querySelectorAll<HTMLElement>("[data-body]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (new URLSearchParams(window.location.search).has("gravity-debug")) stage.dataset.debug = "";

    // Scene-unit sizes for the current width (objects keep a legible minimum on phones).
    const sizes = (s: number) => {
      const r = Math.max(ICON_R, T.minIconPx / 2 / s);
      const h = Math.max(LABEL_SIZE.h, T.minLabelPx / s);
      const w = (h * LABEL_SIZE.w) / LABEL_SIZE.h;
      return Object.fromEntries(els.map((el) => [el.dataset.body!, el.dataset.kind === "disc" ? { r } : { w, h }]));
    };
    const scaleNow = () => stage.clientWidth / SCENE_W;

    // Reduced motion: the landed composition, placed once (CSS keeps it in scale).
    if (reduce) {
      for (const el of els) {
        const tg = TARGET[el.dataset.body!];
        el.style.left = `${(tg.x / SCENE_W) * 100}%`;
        el.style.top = `${(tg.y / SCENE_H) * 100}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${tg.angle}deg)`;
      }
      return;
    }

    let alive = true;
    let world: GravityWorld | null = null;
    let triggered = false;
    let onScreen = false;
    let loading = false;

    // Runs only while released, on screen and in a visible tab (state mirrored as data-running).
    const run = () => {
      if (!world || !world.released) return;
      stage.dataset.released = "";
      if (onScreen && document.visibilityState === "visible") {
        world.start();
        stage.dataset.running = "";
      } else {
        world.stop();
        delete stage.dataset.running;
      }
    };

    const load = () => {
      if (loading) return;
      loading = true;
      import("matter-js")
        .then((mod) => {
          if (!alive) return;
          const M = (mod as unknown as { default?: typeof mod }).default ?? mod;
          const s = scaleNow();
          const z = sizes(s);
          const objects: GravityObject[] = els.map((el) => ({ id: el.dataset.body!, kind: el.dataset.kind as "disc" | "capsule", el, ...z[el.dataset.body!] }));
          world = createGravityWorld(M, objects);
          // Hand the objects over from CSS placement to transforms — same pixels.
          for (const el of els) {
            el.style.left = "0";
            el.style.top = "0";
          }
          world.setScale(s, z);
          stage.dataset.physics = "";
          if (triggered) {
            world.release();
            run();
          }
        })
        .catch(() => {
          /* static fallback: the designed composition stays as it is */
        });
    };
    // matter-js is fetched only as the footer approaches.
    const near = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        near.disconnect();
        load();
      },
      { rootMargin: "900px 0px" },
    );
    near.observe(stage);

    // Release: once, when the bottom of the viewport reaches the icon row.
    const trigger = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      trigger.disconnect();
      triggered = true;
      if (world) {
        world.release();
        run();
      }
    });
    trigger.observe(row);

    const visible = new IntersectionObserver((es) => {
      onScreen = es[es.length - 1].isIntersecting;
      run();
    });
    visible.observe(stage);
    const onVisibility = () => run();
    document.addEventListener("visibilitychange", onVisibility);

    let lastW = stage.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = stage.clientWidth;
      if (!world || Math.abs(w - lastW) < 1) return;
      lastW = w;
      const s = scaleNow();
      world.setScale(s, sizes(s));
    });
    ro.observe(stage);

    // ---------------------------------------------------------------- pointer
    const toScene = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect(), s = r.width / SCENE_W;
      return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
    };
    const last = new Map<number, { x: number; y: number; t: number }>();
    const presses = new Map<number, { x: number; y: number; t: number; el: HTMLElement; moved: boolean }>();
    let suppressClick: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      const p = toScene(e);
      const press = presses.get(e.pointerId);
      if (press) {
        if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) press.moved = true;
        world?.drag(e.pointerId, p, e.timeStamp);
      } else if (e.pointerType === "mouse") {
        const prev = last.get(e.pointerId);
        if (prev) world?.sweep(prev, p, e.timeStamp - prev.t, e.timeStamp);
      }
      last.set(e.pointerId, { ...p, t: e.timeStamp });
    };
    const onLeave = (e: PointerEvent) => last.delete(e.pointerId);
    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element).closest<HTMLElement>("[data-body]");
      if (!el || !world?.released || e.button > 0) return;
      if (!world.grab(e.pointerId, el.dataset.body!, toScene(e), e.timeStamp)) return;
      presses.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, el, moved: false });
      el.setPointerCapture(e.pointerId);
      el.dataset.grabbed = "";
    };
    const onUp = (e: PointerEvent) => {
      const press = presses.get(e.pointerId);
      if (!press) return;
      presses.delete(e.pointerId);
      world?.drop(e.pointerId);
      delete press.el.dataset.grabbed;
      // A drag (or a long hold) is never a click: the link must not open.
      if (press.moved || e.timeStamp - press.t > 450 || e.type === "pointercancel") suppressClick = press.el;
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLElement>("[data-body]");
      if (el && el === suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
      suppressClick = null;
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("click", onClick, true);

    return () => {
      alive = false;
      near.disconnect();
      trigger.disconnect();
      visible.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("click", onClick, true);
      world?.destroy();
      world = null;
      delete stage.dataset.physics;
      delete stage.dataset.released;
      delete stage.dataset.running;
      for (const el of els) {
        el.style.removeProperty("left");
        el.style.removeProperty("top");
        el.style.removeProperty("transform");
      }
    };
  }, []);

  const debug = process.env.NODE_ENV !== "production"; // collision overlay (dev builds): add ?gravity-debug
  return (
    <section className={`zorx-gravity ${servicesFont.variable}`} aria-labelledby="zorx-gravity-title">
      <h2 id="zorx-gravity-title" className="sr-only">
        Thanks — follow ZORX
      </h2>
      <div ref={stageRef} className="zorx-gravity-stage">
        <span className="zorx-gravity-row" aria-hidden="true" />
        <svg className="zorx-gravity-letters" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} aria-hidden="true" focusable="false">
          {LETTERS.map((l) => (
            <path key={l.id} d={l.d} />
          ))}
          {debug && (
            <g className="zorx-gravity-debug">
              {LETTERS.flatMap((l) =>
                l.parts.map((p, i) => (
                  <polygon key={`${l.id}${i}`} points={p.reduce<string[]>((s, v, j) => (j % 2 ? s : [...s, `${v},${p[j + 1]}`]), []).join(" ")} />
                )),
              )}
            </g>
          )}
        </svg>

        <ul className="zorx-gravity-socials" aria-label="ZORX on social media">
          {SOCIALS.map((s) => {
            const style = { ...at(s.id), "--bg": s.bg, "--fg": s.fg } as CSSProperties;
            const glyph = (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {GLYPHS[s.id]}
              </svg>
            );
            return (
              <li key={s.id} className="zorx-gravity-icon" data-body={s.id} data-kind="disc" style={style}>
                {s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} draggable={false}>
                    {glyph}
                  </a>
                ) : (
                  <span role="img" aria-label={s.label}>
                    {glyph}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {GREETINGS.map((g) => (
          <span
            key={g.id}
            className="zorx-gravity-label"
            data-body={g.id}
            data-kind="capsule"
            style={{ ...at(g.id), "--bg": g.bg } as CSSProperties}
          >
            {g.text}
          </span>
        ))}
      </div>
    </section>
  );
}
