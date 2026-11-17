import Image from "next/image";
import type { CSSProperties } from "react";
import { ASSETS } from "@/config/brand";

interface Props {
  /** Bird width in px — 24–40 depending on context. */
  size?: number;
  label?: string;
  className?: string;
}

/** Ring box ÷ bird width: the ring's inner edge clears the bird with even space. */
const SUN_SCALE = 1.75;

/**
 * The NORMAL ZORX loading indicator: the small, static white bird (cut from the
 * official o.png artwork) inside the hand-drawn sun ring, which turns slowly
 * around it (CSS only; static with reduced motion).
 *
 * Completely independent of the cinematic intro — it never plays Loading.mp4
 * and never triggers the landing animation. Use it for data, component and
 * dynamic-content loading states.
 */
export function LoadingIndicator({ size = 32, label = "Loading", className = "" }: Props) {
  const w = Math.min(40, Math.max(24, size));
  const bird = ASSETS.birdIcon;
  const sun = ASSETS.loadingSun;
  const box = Math.round(w * SUN_SCALE);
  const sunW = box;
  const sunH = (box * sun.height) / sun.width;
  // Place the ring so its own centre (not the PNG's) sits on the box centre.
  const style = {
    width: box,
    height: box,
    "--sun-w": `${sunW}px`,
    "--sun-h": `${sunH}px`,
    "--sun-ox": `${(sun.cx / sun.width) * 100}%`,
    "--sun-oy": `${(sun.cy / sun.height) * 100}%`,
    "--sun-x": `${box / 2 - (sun.cx / sun.width) * sunW}px`,
    "--sun-y": `${box / 2 - (sun.cy / sun.height) * sunH}px`,
  } as CSSProperties;
  return (
    <span role="status" aria-live="polite" className={`zorx-loading ${className}`} style={style}>
      <Image
        src={sun.src}
        alt=""
        width={sun.width}
        height={sun.height}
        unoptimized
        loading="lazy" // fetched only when an indicator is actually rendered
        className="zorx-loading-sun zorx-loading-sun-invert"
      />
      <Image
        src={bird.src}
        alt=""
        width={bird.width}
        height={bird.height}
        unoptimized
        loading="lazy"
        className="zorx-loading-indicator"
        style={{ width: w }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
