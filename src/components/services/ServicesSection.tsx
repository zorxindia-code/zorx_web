"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SERVICES, SERVICES_TUNING as T, type BirdClip, type ClipSources } from "@/config/services";
import { placeBird } from "@/lib/services/placement";
import { BirdAnimation } from "./BirdAnimation";
import { ServiceRow } from "./ServiceRow";
import { servicesFont } from "./font";

/** Safari / any iOS browser: VP9 alpha isn't supported, HEVC alpha is. */
function prefersHevcAlpha() {
  const ua = navigator.userAgent;
  const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(ua);
  return ios || safari;
}

type Phase = "idle" | "entering" | "perched" | "exiting";

/**
 * Editorial services selector. Hover (or tap) highlights a row immediately;
 * after an intentional delay its bird flies in and perches on the divider below
 * it; when the row is left, the bird takes off and flies out.
 *
 * One central controller, no React state:
 *  - input only sets which bird is WANTED (`want`)
 *  - the bird state machine (idle → entering → perched → exiting → idle) acts
 *    only when it is settled, so there is never more than one bird, a flight is
 *    never cut short, and an old exit can't collide with a new entrance.
 */
export default function ServicesSection() {
  const section = useRef<HTMLElement>(null);
  const enterRef = useRef<HTMLVideoElement>(null);
  const exitRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = section.current!;
    const enterV = enterRef.current!;
    const exitV = exitRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hevc = prefersHevcAlpha();
    const rows = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("[data-service]").forEach((r) => rows.set(r.dataset.service!, r));
    const order = SERVICES.map((s) => s.id);
    const clipOf = (id: string | null) => (id ? (SERVICES.find((s) => s.id === id)?.bird ?? null) : null);
    const src = (c: ClipSources) => (hevc ? c.hevc : c.webm);

    // ---------------------------------------------------------- state
    let active: string | null = null; // highlighted row (input)
    let lingering: string | null = null; // row kept bold while its bird flies off
    let want: string | null = null; // bird that should be out
    let phase: Phase = "idle";
    let current: string | null = null; // bird that is out
    let timer = 0;
    gsap.set([enterV, exitV], { autoAlpha: 0 });

    // ---------------------------------------------------------- bird helpers
    const load = (clip: BirdClip) => {
      if (enterV.dataset.clip === clip.id) return;
      enterV.dataset.clip = clip.id;
      enterV.src = src(clip.enter);
      enterV.preload = "auto";
      if (clip.exit) {
        exitV.src = src(clip.exit);
        exitV.preload = "auto";
      } else exitV.removeAttribute("src");
    };

    const place = (id: string) => {
      const clip = clipOf(id);
      const row = rows.get(id);
      if (!clip || !row) return;
      const next = rows.get(order[order.indexOf(id) + 1] ?? "");
      const sec = root.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const textRight = (el?: HTMLElement) =>
        el ? el.querySelector(".zorx-service-label")!.getBoundingClientRect().right - sec.left : 0;
      const p = placeBird(clip.meta, {
        width: sec.width,
        dividerY: r.bottom - sec.top + 0.5, // centre of the 1px divider below the row (next row's top border)
        rowHeight: r.height,
        textRight: textRight(row),
        nextTextRight: textRight(next),
      });
      gsap.set([enterV, exitV], { x: p.x, y: p.y, scale: p.scale, width: clip.meta.width, height: clip.meta.height });
    };

    /** Visible-but-transparent: Firefox only decodes videos it considers visible. */
    const stage = (v: HTMLVideoElement) => gsap.set(v, { visibility: "visible", opacity: 0 });

    const setRow = (id: string | null, on: boolean) => {
      const row = id ? rows.get(id) : null;
      if (!row) return;
      if (on) row.dataset.active = "";
      else delete row.dataset.active;
      row.querySelector("button")?.setAttribute("aria-pressed", String(on));
    };

    // ---------------------------------------------------------- state machine
    function reconcile() {
      if (phase === "entering" || phase === "exiting") return; // let the flight finish
      if (phase === "perched" && want !== current) return startExit();
      if (phase === "idle" && want) startEnter(want);
    }

    function startEnter(id: string) {
      const clip = clipOf(id)!;
      load(clip);
      place(id);
      current = id;
      phase = "entering";
      gsap.killTweensOf([enterV, exitV]);
      if (clip.exit) {
        stage(exitV);
        exitV.currentTime = 0; // first take-off frame ready for the hand-off
      }
      if (reduce) {
        enterV.currentTime = Math.max(0, clip.meta.duration - 0.05);
        gsap.to(enterV, { autoAlpha: 1, duration: 0.4, onComplete: onEntered });
        return;
      }
      enterV.currentTime = 0;
      gsap.set(enterV, { autoAlpha: 1 });
      enterV.play().catch(() => {});
    }

    function onEntered() {
      if (phase !== "entering") return;
      phase = "perched";
      reconcile();
    }

    function startExit() {
      const clip = clipOf(current);
      phase = "exiting";
      gsap.killTweensOf([enterV, exitV]);
      if (!clip?.exit || reduce) {
        gsap.to(enterV, { autoAlpha: 0, duration: T.fade, ease: "power1.out", onComplete: onExited });
        return;
      }
      // Take-off: the first exit frame is the same perched pose — overlap briefly.
      exitV.currentTime = 0;
      gsap.to(exitV, { opacity: 1, duration: T.handoff, ease: "none" });
      gsap.to(enterV, { autoAlpha: 0, duration: T.handoff, ease: "none", delay: T.handoff * 0.5 });
      exitV.play().catch(() => onExited());
    }

    function onExited() {
      if (phase !== "exiting") return;
      gsap.killTweensOf([enterV, exitV]);
      gsap.set([enterV, exitV], { autoAlpha: 0 });
      enterV.pause();
      exitV.pause();
      if (lingering === current) {
        setRow(lingering, false); // typography returns once the bird has left
        lingering = null;
      }
      current = null;
      phase = "idle";
      reconcile();
    }

    const onEnterEnded = () => onEntered();
    const onExitEnded = () => onExited();
    enterV.addEventListener("ended", onEnterEnded);
    exitV.addEventListener("ended", onExitEnded);

    // ---------------------------------------------------------- input → want
    const activate = (id: string, delay: number) => {
      if (active === id) return;
      window.clearTimeout(timer);
      // Switching rows: the previous row (and any lingering one) returns at once.
      if (active) setRow(active, false);
      if (lingering && lingering !== id) setRow(lingering, false);
      lingering = null;
      active = id;
      setRow(id, true); // typography responds immediately
      if (want !== id) want = null; // a different row's bird should leave now
      reconcile();
      const clip = clipOf(id);
      if (!clip) return;
      if (phase === "idle") {
        load(clip); // buffer during the intent delay
        place(id);
        stage(enterV);
      }
      timer = window.setTimeout(() => {
        if (active !== id) return;
        want = id;
        reconcile();
      }, delay);
    };

    const deactivate = () => {
      window.clearTimeout(timer);
      if (!active) return;
      const id = active;
      active = null;
      want = null;
      // Keep the row bold while its bird is out; otherwise return immediately.
      if (current === id && phase !== "idle") lingering = id;
      else setRow(id, false);
      reconcile();
      if (phase === "idle") gsap.set(enterV, { autoAlpha: 0 });
    };

    let lastPointer = "mouse";
    const onPointerDown = (e: PointerEvent) => (lastPointer = e.pointerType);
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      activate((e.currentTarget as HTMLElement).dataset.service!, T.hoverDelayMs);
    };
    const onLeaveSection = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") deactivate();
    };
    const onClick = (e: MouseEvent) => {
      if (lastPointer === "mouse" || lastPointer === "pen") return; // hover handles mice
      const id = (e.currentTarget as HTMLElement).dataset.service!;
      if (active === id) deactivate(); // tap the active row again → bird takes off
      else activate(id, T.tapDelayMs);
    };
    const onFocus = (e: FocusEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-service]");
      if (row && lastPointer !== "touch") activate(row.dataset.service!, T.hoverDelayMs);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node)) deactivate();
    };
    const onDocDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !root.contains(e.target as Node)) deactivate(); // tap outside
    };
    const onResize = () => current && place(current);

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointerleave", onLeaveSection);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onDocDown);
    window.addEventListener("resize", onResize);
    rows.forEach((r) => {
      r.addEventListener("pointerenter", onEnter);
      r.addEventListener("click", onClick);
    });

    return () => {
      window.clearTimeout(timer);
      gsap.killTweensOf([enterV, exitV]);
      enterV.pause();
      exitV.pause();
      enterV.removeEventListener("ended", onEnterEnded);
      exitV.removeEventListener("ended", onExitEnded);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerleave", onLeaveSection);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onDocDown);
      window.removeEventListener("resize", onResize);
      rows.forEach((r) => {
        r.removeEventListener("pointerenter", onEnter);
        r.removeEventListener("click", onClick);
      });
    };
  }, []);

  return (
    <section
      ref={section}
      className={`zorx-services ${servicesFont.variable}`}
      aria-labelledby="zorx-services-title"
    >
      <h2 id="zorx-services-title" className="sr-only">
        Services
      </h2>
      <ul className="zorx-services-list">
        {SERVICES.map((s) => (
          <ServiceRow key={s.id} service={s} />
        ))}
      </ul>
      <BirdAnimation enterRef={enterRef} exitRef={exitRef} />
    </section>
  );
}
