/**
 * Stage 01: resolves after `minMs` once the essentials are ready — the bird
 * video can play and the logo artwork is decoded — and never later than
 * `maxMs`. Never waits for the showreel.
 */
export function waitForEssentials(
  video: HTMLVideoElement,
  images: HTMLImageElement[],
  minMs: number,
  maxMs: number,
) {
  let timer = 0;
  let minTimer = 0;
  let cancelled = false;

  const videoReady = new Promise<void>((res) => {
    if (video.readyState >= 3) return res();
    const done = () => res();
    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", done, { once: true });
  });
  const imagesReady = Promise.all(images.map((img) => img.decode().catch(() => {})));
  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  const minElapsed = new Promise<void>((res) => (minTimer = window.setTimeout(res, minMs)));

  const promise = Promise.race([
    Promise.all([videoReady, imagesReady, fontsReady, minElapsed]),
    new Promise<void>((res) => (timer = window.setTimeout(res, maxMs))),
  ]).then(() => {
    window.clearTimeout(timer);
    if (cancelled) throw new Error("cancelled");
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(minTimer);
    },
  };
}

export interface BirdController {
  /** Removes the autoplay-fallback listeners. */
  dispose(): void;
  /** Natural, looping wing-flapping (Phase A + the scroll-driven growth). */
  play(): void;
  /** Playback speed while playing (1 = original). Ignores changes < 0.05. */
  setRate(rate: number): void;
  /** Settle: scroll scrubs the video to its final frame (= o.png's bird pose). p ∈ [0,1]. */
  scrub(p: number): void;
  /** Hold the final frame (logo pose). */
  hold(): void;
}

/**
 * The single bird video's three modes. Switching only happens when the mode
 * changes; scrubbing issues one cheap seek per playhead update (the derived
 * video has a keyframe every 2 frames).
 */
export function createBirdController(video: HTMLVideoElement, duration: number, reduce: boolean): BirdController {
  const END = duration - 0.001;
  let mode: "play" | "scrub" | "hold" = reduce ? "hold" : "play";
  let from = 0; // video time the scrub starts from

  const seek = (t: number) => {
    if (Math.abs(video.currentTime - t) > 1 / 120) video.currentTime = t;
  };

  if (reduce) {
    video.pause();
    seek(END);
  }

  // If the browser refused muted autoplay (e.g. iOS Low Power Mode), start the
  // bird on the visitor's first gesture — this also clears the browser's own
  // play glyph, which page CSS cannot style in current WebKit.
  const gestures = ["pointerdown", "touchstart", "keydown"] as const;
  const resume = () => {
    gestures.forEach((g) => window.removeEventListener(g, resume));
    if (mode === "play" && video.paused) video.play().catch(() => {});
  };
  if (!reduce && video.paused) {
    video.play().catch(() => gestures.forEach((g) => window.addEventListener(g, resume, { passive: true })));
  }

  return {
    dispose() {
      gestures.forEach((g) => window.removeEventListener(g, resume));
    },
    setRate(rate) {
      if (reduce) return;
      const r = rate < 1.05 ? 1 : rate; // at rest: exactly the original speed
      if (r === video.playbackRate || (r !== 1 && Math.abs(video.playbackRate - r) < 0.05)) return;
      video.playbackRate = r;
    },
    play() {
      if (reduce || mode === "play") return;
      mode = "play";
      video.play().catch(() => {});
    },
    scrub(p) {
      if (reduce) return;
      if (mode !== "scrub") {
        // From below: continue from wherever the flap is. From above (reverse
        // scroll out of the logo): rewind through the last 1.5 s of flapping.
        from = mode === "play" ? Math.min(video.currentTime, END) : Math.max(0, END - 1.5);
        mode = "scrub";
        video.pause();
      }
      seek(from + (END - from) * Math.min(1, Math.max(0, p)));
    },
    hold() {
      if (mode === "hold") return;
      mode = "hold";
      video.pause();
      seek(END);
    },
  };
}
