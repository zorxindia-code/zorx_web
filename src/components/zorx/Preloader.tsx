import type { Ref } from "react";
import { BirdAnimation } from "./BirdAnimation";

/** Stage 01: the pure-white field and a single bird video. Nothing else. */
export function Preloader({ videoRef }: { videoRef: Ref<HTMLVideoElement> }) {
  return <BirdAnimation ref={videoRef} />;
}
