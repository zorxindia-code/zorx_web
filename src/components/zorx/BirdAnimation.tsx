import type { Ref } from "react";
import { ASSETS } from "@/config/brand";

/**
 * The ONLY bird during the cinematic intro: one <video> of the original bird
 * animation (Loading.mp4, black on pure white). It autoplays and loops
 * from the HTML itself, so the wings keep flapping however long the visitor
 * waits; scroll then scales this same element into the O.
 */
export function BirdAnimation({ ref }: { ref: Ref<HTMLVideoElement> }) {
  return (
    <video
      ref={ref}
      className="zorx-loader"
      src={ASSETS.loader}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-hidden="true"
    />
  );
}
