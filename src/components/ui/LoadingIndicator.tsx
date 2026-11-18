import Image from "next/image";
import type { CSSProperties } from "react";
import { ASSETS } from "@/config/brand";

interface Props {
  /** Width of the central ZORX bird in px — 24–40 depending on context. */
  size?: number;
  label?: string;
  className?: string;
}

/** Sun box ÷ bird width: the ring's inner edge clears the bird with even space. */
const SUN_SCALE = 1.75;

/**
 * The ZORX loader: the stationary ZORX bird (ASSETS.birdIcon) in the centre,
 * and the supplied sun (ASSETS.loadingSun) turning around it — a steady 360°
 * spin about the ring's own measured centre, so its faint, light sides sweep
 * round the circle like a spinner. Only the sun moves; the bird never does.
 * White on the black grounds it is used on (the PNG is black ink; inverted in
 * CSS, file untouched). Still with reduced motion.
 *
 * Rendered only by real loading states — the route fallback (app/loading.tsx)
 * and the showreel while it buffers — and fades in after a short grace period,
 * so a load that finishes at once never flashes it. The intro has its own sun
 * around its bird video (Preloader), shown only while its assets load.
 */
export function LoadingIndicator({ size = 32, label = "Loading", className = "" }: Props) {
  const w = Math.min(40, Math.max(24, size));
  const bird = ASSETS.birdIcon;
  const sun = ASSETS.loadingSun;
  const box = Math.round(w * SUN_SCALE);
  const sunH = (box * sun.height) / sun.width;
  // Place the ring so its own centre (not the PNG's) sits on the box centre.
  const style = {
    width: box,
    height: box,
    "--sun-w": `${box}px`,
    "--sun-x": `${box / 2 - (sun.cx / sun.width) * box}px`,
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
        loading="eager"
        className="zorx-loading-sun zorx-loading-sun-invert"
      />
      <Image
        src={bird.src}
        alt=""
        width={bird.width}
        height={bird.height}
        unoptimized
        loading="eager"
        className="zorx-loading-logo"
        style={{ width: w }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
