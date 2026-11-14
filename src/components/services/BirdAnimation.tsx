import type { Ref } from "react";

/**
 * The service bird: one ENTER video (fly in → land → rest) and one EXIT video
 * (take off → fly out), stacked at the same transform. Only one is visible at a
 * time, except for a ~0.12 s overlap at take-off where both show the same
 * perched pose. No sources until a service with a bird is activated —
 * ServicesSection drives both imperatively. Nothing loops; at rest nothing decodes.
 */
export function BirdAnimation({
  enterRef,
  exitRef,
}: {
  enterRef: Ref<HTMLVideoElement>;
  exitRef: Ref<HTMLVideoElement>;
}) {
  return (
    <>
      <video ref={enterRef} className="zorx-service-bird" muted playsInline preload="none" disablePictureInPicture aria-hidden="true" />
      <video ref={exitRef} className="zorx-service-bird" muted playsInline preload="none" disablePictureInPicture aria-hidden="true" />
    </>
  );
}
