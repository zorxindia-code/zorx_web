import Image from "next/image";
import type { Ref } from "react";
import { ASSETS } from "@/config/brand";
import { BirdAnimation } from "./BirdAnimation";

/**
 * Stage 01: the pure-white field, the single bird video and the hand-drawn sun
 * ring turning around it. The ring's box mirrors the video's box (same CSS, and
 * the timeline moves both together), so it stays centred on the bird.
 */
export function Preloader({
  videoRef,
  sunRef,
}: {
  videoRef: Ref<HTMLVideoElement>;
  sunRef: Ref<HTMLDivElement>;
}) {
  const sun = ASSETS.loadingSun;
  return (
    <>
      <BirdAnimation ref={videoRef} />
      <div ref={sunRef} className="zorx-loader-sun" aria-hidden="true">
        <Image
          src={sun.src}
          alt=""
          width={sun.width}
          height={sun.height}
          unoptimized
          loading="eager"
          fetchPriority="high"
          className="zorx-loading-sun zorx-loader-sun-ring"
        />
      </div>
    </>
  );
}
