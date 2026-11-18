import Image from "next/image";
import type { CSSProperties } from "react";
import type { Office } from "@/config/contact";
import { BIRD_BOX, BIRD_PATH, BIRD_REST, MAP_H, MAP_IMAGE, MAP_MARKERS, MAP_W, MARKER, ROUTE } from "@/lib/contactMap";
import MapMotion from "./MapMotion";

const FLIGHT_S = 7; // one India → UAE crossing
const PLACES: Record<string, string> = { uae: "Dubai, UAE", india: "Kerala, India" };

/**
 * The contact map, exactly as the supplied artwork: blue seas on white, red
 * ring markers on Dubai and Kerala and the small black bird over the Arabian
 * Sea. The seas are a static traced SVG (scripts/trace-contact-map.mjs); the
 * markers (soft pulse) and the bird (flying the route, crossing its spot in
 * the artwork in the artwork's pose) are live on top, in the same units.
 * With reduced motion the bird simply rests where the artwork has it.
 */
export default function ContactMap({ offices }: { offices: readonly Office[] }) {
  const pins = offices.flatMap((o) => {
    const at = MAP_MARKERS[o.id as keyof typeof MAP_MARKERS];
    return at ? [{ id: o.id, at }] : [];
  });
  const places = pins.map((p) => PLACES[p.id]).filter(Boolean);
  const [bx0, by0, bx1, by1] = BIRD_BOX;

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
        {pins.map((p) => (
          <g key={p.id} data-map-marker={p.id} transform={`translate(${p.at.x} ${p.at.y})`}>
            <circle r={MARKER.ring} className="zorx-map-pin-pulse" />
            <circle r={MARKER.ring} className="zorx-map-pin-pulse zorx-map-pin-pulse-late" />
            <circle r={MARKER.ring} strokeWidth={MARKER.ringWidth} className="zorx-map-pin-ring" />
            <circle r={MARKER.dot} className="zorx-map-pin-dot" />
          </g>
        ))}

        {/* Flying: India → UAE, fading in and out at the markers. */}
        <g className="zorx-map-flight">
          <path d={BIRD_PATH} />
          <animateMotion
            dur={`${FLIGHT_S}s`}
            repeatCount="indefinite"
            rotate="auto"
            path={ROUTE}
            calcMode="spline"
            keyTimes="0;1"
            keyPoints="0;1"
            keySplines="0.45 0 0.55 1"
          />
          <animate
            attributeName="opacity"
            dur={`${FLIGHT_S}s`}
            repeatCount="indefinite"
            values="0;1;1;0"
            keyTimes="0;0.1;0.88;1"
          />
        </g>
        {/* Reduced motion: at rest, exactly where and as the artwork has it. */}
        <path
          d={BIRD_PATH}
          className="zorx-map-rest"
          transform={`translate(${BIRD_REST.x} ${BIRD_REST.y}) rotate(${BIRD_REST.angle})`}
        />
      </svg>

      {/* Touch: tapping a marker sends a bird once round it (see MapMotion). */}
      <div className="zorx-map-tapbird" aria-hidden="true">
        <svg
          viewBox={`${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`}
          style={{ "--bx": bx0, "--by": by0, "--bw": bx1 - bx0, "--bh": by1 - by0 } as CSSProperties}
        >
          <path d={BIRD_PATH} />
        </svg>
      </div>
    </MapMotion>
  );
}
