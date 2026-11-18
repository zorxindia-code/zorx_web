import type { BirdClip } from "@/config/services";

/**
 * The service birds: for each bird, one ENTER video (fly in → land → rest) and
 * one EXIT video (take off → fly out), stacked at the same transform. Each bird
 * keeps its own pair, so its clips are fetched once and stay buffered — no
 * source swapping between birds (Safari would re-download on every swap).
 * No sources until that bird is first needed; ServicesSection drives them.
 * Only one bird is ever visible; nothing loops; at rest nothing decodes.
 */
export function BirdAnimation({ birds }: { birds: BirdClip[] }) {
  return (
    <>
      {birds.flatMap((b) =>
        (["enter", "exit"] as const).map((role) => (
          <video
            key={`${b.id}-${role}`}
            data-bird={b.id}
            data-role={role}
            className="zorx-service-bird"
            muted
            playsInline
            preload="none"
            disablePictureInPicture
            aria-hidden="true"
          />
        )),
      )}
      {/* The divider over a bird's own tail, behind its toes (see BirdGrip). */}
      {birds.map((b) =>
        b.grip ? <div key={`${b.id}-grip`} data-grip={b.id} className="zorx-service-grip" aria-hidden="true" /> : null,
      )}
    </>
  );
}
