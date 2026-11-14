import Image from "next/image";
import type { Ref } from "react";
import { ASSETS } from "@/config/brand";

interface Props {
  frameRef: Ref<HTMLDivElement>;
  artRef: Ref<HTMLDivElement>;
  zRef: Ref<HTMLDivElement>;
  xRef: Ref<HTMLDivElement>;
  taglineRef: Ref<HTMLDivElement>;
}

/** Tagline metrics in lockup px (band rows 690–800 of the 1920-wide lockup). */
const TAGLINE = { x: -9.5, baseline: 94.5, size: 119, length: 1932 } as const;

// Supplied artwork is served untouched (re-encoding would shift the Ice Blue).
// Low fetch priority: the loader video must win the bandwidth race.
const art = { unoptimized: true, draggable: false, loading: "eager", fetchPriority: "low" } as const;

/**
 * Experience two — the ZORX elements, each the supplied artwork as a separate,
 * individually animated element. o.png stays hidden until the loader video
 * has landed on it, so only one bird is ever on screen.
 */
export function ZorxLogoReveal({ frameRef, artRef, zRef, xRef, taglineRef }: Props) {
  return (
    <>
      {/* Ice Blue field: the full-screen preloader background, then the O, then the reel frame */}
      <div ref={frameRef} className="zorx-abs zorx-field" />

      <div ref={artRef} className="zorx-abs zorx-art">
        <span className="zorx-art-back" />
        <Image {...art} alt="" src={ASSETS.o} width={739} height={739} className="zorx-art-img" />
      </div>

      <div ref={zRef} className="zorx-abs zorx-square">
        <Image {...art} alt="" src={ASSETS.z} width={739} height={739} className="h-full w-full" />
      </div>
      <div ref={xRef} className="zorx-abs zorx-square">
        <Image {...art} alt="" src={ASSETS.x} width={739} height={739} className="h-full w-full" />
      </div>

      {/*
        INTERACTIVE AGENCY — one text element. Drawn in the official lockup's
        tagline band (1920 × 110 lockup px): cap-height and full-width tracking
        match zorx-logo-white.png, without that file's second, cropped text row.
      */}
      <div ref={taglineRef} className="zorx-abs zorx-tagline">
        <svg viewBox="0 0 1920 110" preserveAspectRatio="none" role="img" aria-label="Interactive Agency">
          <text x={TAGLINE.x} y={TAGLINE.baseline} fontSize={TAGLINE.size} textLength={TAGLINE.length} lengthAdjust="spacing">
            INTERACTIVE AGENCY
          </text>
        </svg>
      </div>
    </>
  );
}
