"use client";

import { useEffect, useRef } from "react";
import type { ProjectMedia } from "@/config/work";

/**
 * A gallery video: muted, looping, inline. Nothing is downloaded until it is
 * near the viewport (the source is attached only then; the poster shows
 * before). It plays only while visible and pauses off-screen or in a hidden
 * tab. Autoplay refused or reduced motion: the poster / first frame stays.
 */
export function ProjectVideo({ media }: { media: ProjectMedia }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || !("IntersectionObserver" in window)) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;
    const sync = () => {
      if (still) return;
      if (visible && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        v.src = media.src;
        v.preload = still ? "metadata" : "auto";
        sync();
      },
      { rootMargin: "300px 0px" },
    );
    const seen = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (v.src) sync();
      },
      { threshold: 0.25 },
    );
    near.observe(v);
    seen.observe(v);
    document.addEventListener("visibilitychange", sync);
    return () => {
      near.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", sync);
      v.pause();
    };
  }, [media.src]);

  return (
    <video
      ref={ref}
      className="zorx-project-video"
      width={media.width}
      height={media.height}
      poster={media.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={media.alt}
    />
  );
}
