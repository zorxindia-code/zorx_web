import Image from "next/image";
import { ASSETS } from "@/config/brand";

interface Props {
  /** Bird width in px — 24–40 depending on context. */
  size?: number;
  label?: string;
  className?: string;
}

/**
 * The NORMAL ZORX loading indicator: a small, static white bird on a
 * transparent background, cut from the official o.png artwork.
 *
 * Completely independent of the cinematic intro — it never plays Loading.mp4
 * and never triggers the landing animation. Use it for data, component and
 * dynamic-content loading states.
 */
export function LoadingIndicator({ size = 32, label = "Loading", className = "" }: Props) {
  const w = Math.min(40, Math.max(24, size));
  const { src, width, height } = ASSETS.birdIcon;
  return (
    <span role="status" aria-live="polite" className={`inline-grid place-items-center ${className}`}>
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        unoptimized
        loading="lazy" // fetched only when an indicator is actually rendered
        className="zorx-loading-indicator"
        style={{ width: w }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
