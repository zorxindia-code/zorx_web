"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MAP_H, MAP_MARKERS, MAP_W } from "@/lib/contactMap";
import { MAP_FLIGHT } from "@/lib/mapFlight";

/**
 * The map's runtime: the flight (SMIL) and pin pulses run only while the map
 * is on screen; reduced motion holds the still artwork. The container is the
 * site cursor's "map" zone (data-cursor-zone — the cursor controller switches
 * to the map bird there). On touch, tapping a marker sends a bird once round it.
 */
export default function MapMotion({ className, children }: { className: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = box.current;
    const svg = root?.querySelector<SVGSVGElement>(".zorx-map-overlay");
    const tapBird = root?.querySelector<HTMLElement>(".zorx-map-tapbird");
    if (!root || !svg || !tapBird) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    tapBird.style.setProperty("--orbit-s", `${MAP_FLIGHT.orbitSeconds}s`);
    tapBird.style.setProperty("--orbit-r", `${MAP_FLIGHT.orbit * 100}cqw`);

    let visible = false;
    const apply = () => {
      if (!reduce.matches && visible) {
        svg.unpauseAnimations();
        root.dataset.playing = "";
      } else {
        svg.pauseAnimations();
        delete root.dataset.playing;
      }
    };
    const io = new IntersectionObserver((es) => {
      visible = es[es.length - 1].isIntersecting;
      apply();
    });
    io.observe(root);
    reduce.addEventListener("change", apply);
    apply();

    // Touch / pen: a tap on (or near) a marker → one loop of the bird round it.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || reduce.matches) return;
      const mw = root.getBoundingClientRect().width;
      let best: { id: string; d: number } | null = null;
      for (const g of root.querySelectorAll<SVGGElement>("[data-map-marker]")) {
        const r = (g.querySelector(".zorx-map-pin-ring") ?? g).getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        if (d < Math.max(24, MAP_FLIGHT.tap * mw) && (!best || d < best.d)) best = { id: g.dataset.mapMarker ?? "", d };
      }
      const at = best && MAP_MARKERS[best.id as keyof typeof MAP_MARKERS];
      if (!at) return;
      tapBird.style.left = `${(at.x / MAP_W) * 100}%`;
      tapBird.style.top = `${(at.y / MAP_H) * 100}%`;
      delete tapBird.dataset.orbit;
      void tapBird.offsetWidth; // restart the loop
      tapBird.dataset.orbit = "";
    };
    const onEnd = () => delete tapBird.dataset.orbit;
    root.addEventListener("pointerdown", onDown, { passive: true });
    tapBird.addEventListener("animationend", onEnd);

    return () => {
      io.disconnect();
      reduce.removeEventListener("change", apply);
      root.removeEventListener("pointerdown", onDown);
      tapBird.removeEventListener("animationend", onEnd);
    };
  }, []);

  return (
    <div ref={box} className={className} data-cursor-zone="map">
      {children}
    </div>
  );
}
