import Image from "next/image";
import type { Ref } from "react";
import { ASSETS } from "@/config/brand";
import { BirdAnimation } from "./BirdAnimation";

/**
 * Stage 01: the pure-white field, the single bird video (the stationary logo)
 * and the sun spinning around it for the whole loading phase. The ring's box
 * mirrors the video's box (same CSS, positioned with it), so it stays centred
 * on the bird; it fades out when loading completes (.zorx-stage[data-ready]).
 */
export function Preloader({ videoRef, ringRef }: { videoRef: Ref<HTMLVideoElement>; ringRef: Ref<HTMLDivElement> }) {
  const sun = ASSETS.loadingSun;
  return (
    <>
      <BirdAnimation ref={videoRef} />
      <div ref={ringRef} className="zorx-loader-ring" role="status" aria-label="Loading ZORX">
        <Image
          src={sun.src}
          alt=""
          width={sun.width}
          height={sun.height}
          unoptimized
          loading="eager"
          fetchPriority="high"
          className="zorx-loading-sun"
        />
      </div>
    </>
  );
}
