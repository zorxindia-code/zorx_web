"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MAP_INTERACTION_TUNING as T } from "@/config/mapInteraction";
import { mapBird } from "@/lib/mapFlight";
import { spotlight, type OfficeId } from "@/lib/officeSpotlight";

const PLACE: Record<OfficeId, string> = { uae: "Dubai, UAE", india: "Kerala, India" };

/**
 * The map's runtime and the office spotlight.
 *  - the map is the site cursor's "map" zone (data-cursor-zone): over it the
 *    cursor becomes the map bird (BirdCursor + lib/mapFlight.ts)
 *  - registers the map's own bird element with lib/mapFlight.ts, which draws
 *    the one bird here whenever the cursor is not on the map (office hovered /
 *    focused, a pin selected, touch)
 *  - pins are buttons (big invisible hit areas): click / tap / Enter / Space
 *    selects an office; another pin switches; an empty map click or Escape clears
 *  - office columns ⇄ map: hovering / focusing a column makes it the active
 *    office (after a short settle delay); the shared state (lib/officeSpotlight)
 *    is mirrored as data attributes: the inactive column fades, the active pin
 *    gets the radar pulse
 *  - pulses run only while the map is on screen
 */
export default function MapMotion({ className, children }: { className: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = box.current!;
    const section = root.closest<HTMLElement>(".zorx-offices") ?? root;
    const svg = root.querySelector<SVGSVGElement>(".zorx-map-overlay")!;
    const auto = root.querySelector<HTMLElement>(".zorx-map-bird")!;
    const status = root.querySelector<HTMLElement>("[data-map-status]");
    const pins = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-pin]"));
    const markers = Array.from(root.querySelectorAll<SVGGElement>("[data-map-marker]"));
    const columns = Array.from(section.querySelectorAll<HTMLElement>(".zorx-office[data-office]"));
    const debug = process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).has("map-debug");
    if (debug) root.dataset.debug = "";
    section.style.setProperty("--office-dim", String(T.inactiveOfficeOpacity));
    section.style.setProperty("--office-fade", `${T.officeTransitionDuration}s`);
    root.style.setProperty("--radar-s", `${T.radarDuration}s`);
    root.style.setProperty("--radar-o", String(T.radarOpacity));

    const ctx = {
      container: root,
      svg,
      auto,
      trail: root.querySelector<SVGPolylineElement>(".zorx-map-trail"),
      debug: debug ? root.querySelector<SVGGElement>(".zorx-map-debug") : null,
    };
    mapBird.attach(ctx);

    // ---------------------------------------------------------------- spotlight → DOM
    const paint = () => {
      const a = spotlight.active, sel = spotlight.get("selection");
      if (a) {
        section.dataset.activeOffice = a;
        root.dataset.active = a;
      } else {
        delete section.dataset.activeOffice;
        delete root.dataset.active;
      }
      markers.forEach((m) => (m.dataset.mapMarker === a ? (m.dataset.active = "") : delete m.dataset.active));
      pins.forEach((p) => p.setAttribute("aria-pressed", String(p.dataset.pin === sel)));
      if (status) status.textContent = sel ? `${PLACE[sel]} office selected` : "";
    };
    const unsub = spotlight.subscribe(paint);
    paint();

    // ---------------------------------------------------------------- pins: select
    const select = (id: OfficeId | null) => spotlight.set("selection", id);
    const onPin = (e: MouseEvent) => {
      const pin = (e.target as Element).closest<HTMLElement>("[data-pin]");
      if (pin) {
        select(pin.dataset.pin as OfficeId);
        return;
      }
      if (root.contains(e.target as Node)) select(null); // an empty map click
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && spotlight.get("selection")) select(null);
    };
    root.addEventListener("click", onPin);
    document.addEventListener("keydown", onKey);

    // ---------------------------------------------------------------- columns / pins hovered or focused → active
    let timer = 0;
    const hover = (id: OfficeId | null) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => spotlight.set("hover", id), T.hoverDelayMs);
    };
    const offs: (() => void)[] = [];
    const watch = (el: HTMLElement, id: OfficeId, pointer: boolean) => {
      const on = (e: Event) => {
        // focus counts when it is keyboard focus (a mouse click also focuses a pin)
        if (e.type === "focusin" && !(e.target as Element).matches(":focus-visible")) return;
        hover(id);
      };
      const off = () => hover(null);
      if (pointer) {
        el.addEventListener("pointerenter", on);
        el.addEventListener("pointerleave", off);
      }
      el.addEventListener("focusin", on);
      el.addEventListener("focusout", off);
      offs.push(() => {
        el.removeEventListener("pointerenter", on);
        el.removeEventListener("pointerleave", off);
        el.removeEventListener("focusin", on);
        el.removeEventListener("focusout", off);
      });
    };
    columns.forEach((c) => watch(c, c.dataset.office as OfficeId, true));
    pins.forEach((p) => watch(p, p.dataset.pin as OfficeId, false)); // keyboard focus on a pin

    // ---------------------------------------------------------------- on screen / tab visibility
    // pulses / radar run only on screen — and never with reduced motion
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((es) => {
      const v = es[es.length - 1].isIntersecting;
      mapBird.setOnScreen(v);
      if (v && !still) root.dataset.playing = "";
      else delete root.dataset.playing;
    });
    io.observe(root);
    const onVisible = () => !document.hidden && mapBird.resume();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsub();
      window.clearTimeout(timer);
      offs.forEach((f) => f());
      root.removeEventListener("click", onPin);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisible);
      io.disconnect();
      mapBird.detach(ctx);
      spotlight.set("hover", null);
      spotlight.set("selection", null);
    };
  }, []);

  return (
    <div ref={box} className={className} data-cursor-zone="map">
      {children}
    </div>
  );
}
