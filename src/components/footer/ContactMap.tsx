import Image from "next/image";
import type { CSSProperties } from "react";
import type { Office } from "@/config/contact";
import { MAP_INTERACTION_TUNING } from "@/config/mapInteraction";
import { BIRD_BOX, BIRD_PATH, MAP_H, MAP_IMAGE, MAP_MARKERS, MAP_W, MARKER } from "@/lib/contactMap";
import MapMotion from "./MapMotion";

const PLACES: Record<string, string> = { uae: "Dubai, UAE", india: "Kerala, India" };

/**
 * The contact map, from the supplied artwork: blue seas on white and red ring
 * markers on Dubai and Kerala. The seas are a static traced SVG
 * (scripts/trace-contact-map.mjs); markers, radar, the optional trail and the
 * debug layer are live on top, in the same units.
 *
 * Exactly one bird: drawn by the site cursor while the mouse is over the map,
 * and by `.zorx-map-bird` below otherwise (an office hovered / focused, a pin
 * selected, touch) — lib/mapFlight.ts hands it between the two.
 * The pins are buttons over the markers (generous hit areas): select an office.
 */
export default function ContactMap({ offices }: { offices: readonly Office[] }) {
  const pins = offices.flatMap((o) => {
    const at = MAP_MARKERS[o.id as keyof typeof MAP_MARKERS];
    return at ? [{ id: o.id, at }] : [];
  });
  const places = pins.map((p) => PLACES[p.id]).filter(Boolean);
  const [bx0, by0, bx1, by1] = BIRD_BOX;
  const radar = MAP_INTERACTION_TUNING.radarMaxRadius * MAP_W;
  const entry = MAP_INTERACTION_TUNING.entryRadius * MAP_W;
  const exit = MAP_INTERACTION_TUNING.exitRadius * MAP_W;
  const debug = process.env.NODE_ENV !== "production"; // shown with ?map-debug (dev builds only)

  return (
    <MapMotion className="zorx-map">
      <Image
        src={MAP_IMAGE}
        alt=""
        width={MAP_W}
        height={MAP_H}
        unoptimized
        loading="lazy"
        draggable={false}
        className="zorx-map-image"
      />
      <svg
        className="zorx-map-overlay"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        role="img"
        aria-label={`Map of the ZORX offices: ${places.join(" and ")}.`}
      >
        {MAP_INTERACTION_TUNING.enableFlightTrail && <polyline className="zorx-map-trail" points="" />}
        {pins.map((p) => (
          <g key={p.id} data-map-marker={p.id} transform={`translate(${p.at.x} ${p.at.y})`}>
            <circle r={MARKER.ring} className="zorx-map-pin-pulse" />
            <circle r={MARKER.ring} className="zorx-map-pin-pulse zorx-map-pin-pulse-late" />
            {/* radar: the active office only */}
            <circle r={radar} className="zorx-map-radar" style={{ "--from": MARKER.ring / radar } as CSSProperties} />
            <circle r={radar} className="zorx-map-radar zorx-map-radar-late" style={{ "--from": MARKER.ring / radar } as CSSProperties} />
            <circle r={MARKER.ring} strokeWidth={MARKER.ringWidth} className="zorx-map-pin-ring" />
            <circle r={MARKER.dot} className="zorx-map-pin-dot" />
          </g>
        ))}
        {debug && (
          <g className="zorx-map-debug">
            {pins.map((p) => (
              <g key={p.id}>
                <circle cx={p.at.x} cy={p.at.y} r={entry} />
                <circle cx={p.at.x} cy={p.at.y} r={exit} strokeDasharray="6 6" />
              </g>
            ))}
            <circle data-debug-orbit="" cx={-999} cy={-999} r={0} />
            <text data-debug-text="" x={12} y={28} />
          </g>
        )}
      </svg>

      {pins.map((p) => (
        <button
          key={p.id}
          type="button"
          className="zorx-map-pin-hit"
          data-pin={p.id}
          aria-pressed="false"
          aria-label={`${PLACES[p.id]} office`}
          style={{ left: `${(p.at.x / MAP_W) * 100}%`, top: `${(p.at.y / MAP_H) * 100}%` }}
        />
      ))}

      {/* The map's own bird (when the cursor is not on the map): lib/mapFlight.ts moves it. */}
      <div className="zorx-map-bird" data-visible="false" aria-hidden="true">
        <svg
          viewBox={`${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`}
          width={bx1 - bx0}
          height={by1 - by0}
          style={{ left: bx0, top: by0 }}
        >
          <path d={BIRD_PATH} />
        </svg>
      </div>
      <p className="sr-only" aria-live="polite" data-map-status="" />
    </MapMotion>
  );
}
