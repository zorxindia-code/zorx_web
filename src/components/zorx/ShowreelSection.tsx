import type { Ref } from "react";
import { ASSETS } from "@/config/brand";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

/**
 * Phase D — the landscape showreel, fixed at the reference frame and revealed by
 * a clip that tracks the growing O. Lazy: preload="none" and no poster until the
 * scroll approaches it; then exactly one source is chosen. While it buffers,
 * the normal ZORX loading indicator shows (toggled via data-loading, no React state).
 */
export function ShowreelSection({
  reelRef,
  videoRef,
}: {
  reelRef: Ref<HTMLDivElement>;
  videoRef: Ref<HTMLVideoElement>;
}) {
  return (
    <div ref={reelRef} className="zorx-abs zorx-reel" data-loading="true">
      <div className="zorx-reel-viewport">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          data-poster={ASSETS.showreel.poster}
          disablePictureInPicture
          aria-label="ZORX client showreel"
        >
          <source src={ASSETS.showreel.small} media="(max-width: 900px)" type="video/mp4" />
          <source src={ASSETS.showreel.large} type="video/mp4" />
        </video>
      </div>
      <div className="zorx-reel-frame" />
      <div className="zorx-reel-loading">
        <LoadingIndicator size={36} label="Loading showreel" />
      </div>
    </div>
  );
}
