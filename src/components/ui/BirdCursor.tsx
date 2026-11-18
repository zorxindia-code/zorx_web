"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ASSETS } from "@/config/brand";
import { BIRD_BOX, BIRD_PATH } from "@/lib/contactMap";
import { createMapFlight } from "@/lib/mapFlight";
import "./BirdCursor.css";

/**
 * Site cursor — the bird from inside the O of the ZORX logo (the existing
 * white cut-out, ASSETS.birdIcon), drawn as a small fixed element that follows
 * the mouse. `mix-blend-mode: difference` makes the white bird read black on
 * the Ice Blue sections and white on the black ones.
 *
 * Hotspot = where the wings meet (253, 148 in the 540×266 cut-out).
 *
 * Mouse only: on touch / pen or on devices without a fine hovering pointer the
 * element stays hidden and the native behaviour is untouched. The system
 * cursor is hidden only once the bird is actually showing (html.zorx-cursor-on).
 *
 * Motion: pointer position written once per animation frame as a transform —
 * no easing loop, so there is no lag. Hover / press states are CSS transitions
 * on an inner element (no transitions with reduced motion).
 *
 * Map mode: over the contact map ([data-cursor-zone="map"]) the logo bird
 * gives way to the map's own black bird, which follows the pointer and circles
 * the Dubai / Kerala markers when it nears them (src/lib/mapFlight.ts). It is a
 * second element only because it must not use the difference blend; this
 * controller owns both, and only one is ever shown.
 */
const HOTSPOT = { x: 253 / 540, y: 148 / 266 };

const CARD = ".zorx-work-card";
const BUTTON = 'button, [role="button"], input[type="submit"], input[type="button"], a.zorx-work-button';
const LINK = "a[href], label, summary, select, input, textarea";

export function BirdCursor() {
  const root = useRef<HTMLDivElement>(null);
  const mapRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const mapEl = mapRoot.current;
    if (!el || !mapEl) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    const html = document.documentElement;
    let x = 0;
    let y = 0;
    let raf = 0;
    let on = false;
    let zone: HTMLElement | null = null;
    const flight = createMapFlight(mapEl);

    const setZone = (next: HTMLElement | null) => {
      if (next === zone) return;
      zone = next;
      if (zone) {
        el.dataset.mode = "map";
        flight.enter(zone, x, y);
      } else {
        delete el.dataset.mode;
        flight.leave();
      }
    };

    const write = () => {
      raf = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const show = (visible: boolean) => {
      if (visible === on) return;
      on = visible;
      el.dataset.visible = visible ? "true" : "false";
      html.classList.toggle("zorx-cursor-on", visible);
      if (!visible) setZone(null);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return show(false); // touch / pen: native behaviour
      x = e.clientX;
      y = e.clientY;
      flight.move(x, y);
      if (!on) write(); // first appearance: place before showing (no slide-in)
      else if (!raf) raf = requestAnimationFrame(write);
      show(true);
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target as Element | null;
      el.dataset.state = t?.closest(CARD) ? "card" : t?.closest(BUTTON) ? "button" : t?.closest(LINK) ? "link" : "";
      x = e.clientX;
      y = e.clientY;
      if (on) setZone(t?.closest<HTMLElement>('[data-cursor-zone="map"]') ?? null);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") el.dataset.pressed = "";
    };
    const onUp = () => delete el.dataset.pressed;
    const onLeaveWindow = (e: MouseEvent) => {
      if (!e.relatedTarget) show(false);
    };
    const onBlur = () => show(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("mouseout", onLeaveWindow);
    window.addEventListener("blur", onBlur);

    return () => {
      cancelAnimationFrame(raf);
      flight.destroy();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("mouseout", onLeaveWindow);
      window.removeEventListener("blur", onBlur);
      html.classList.remove("zorx-cursor-on");
    };
  }, []);

  const { src, width, height } = ASSETS.birdIcon;
  const [bx0, by0, bx1, by1] = BIRD_BOX;
  return (
    <>
      <div ref={root} className="zorx-cursor" data-visible="false" aria-hidden="true">
        <div
          className="zorx-cursor-bird"
          style={{ left: `${-HOTSPOT.x * 100}%`, top: `${-HOTSPOT.y * 100}%`, transformOrigin: `${HOTSPOT.x * 100}% ${HOTSPOT.y * 100}%` }}
        >
          <Image src={src} alt="" width={width} height={height} unoptimized loading="eager" draggable={false} />
        </div>
      </div>
      {/* Map mode: the map's bird, centred on the pointer (its centroid is the hotspot). */}
      <div ref={mapRoot} className="zorx-cursor-map" data-visible="false" aria-hidden="true">
        <svg
          className="zorx-cursor-map-bird"
          viewBox={`${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`}
          width={bx1 - bx0}
          height={by1 - by0}
          style={{ left: bx0, top: by0, transformOrigin: `${-bx0}px ${-by0}px` }}
        >
          <path d={BIRD_PATH} />
        </svg>
      </div>
    </>
  );
}
