"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, RefObject } from "react";
import { useEffect, useRef } from "react";
import { servicesFont } from "@/components/services/font";
import { CONTACT_BIRDS, CONTACT_HREF, FEMALE_TUNING as FT, type ContactBirds, type FemaleClip } from "@/config/contact";
import { prefersHevcAlpha } from "@/lib/videoSupport";
import "./ContactSection.css";

/**
 * Contact: a thin outlined frame on black with "Interested in working
 * together?" and LET'S TALK — and the Blue Manakin courtship perched on the
 * frame's top border: the three dancing males to the left, the female to the
 * right, still, watching them.
 *
 * Entrance: headline, then CTA, rise softly into place once (IntersectionObserver
 * + CSS transitions). The bird clip loads only as the section approaches, plays
 * only while it is on screen, and is a still poster with reduced motion.
 */
export default function ContactSection() {
  const section = useRef<HTMLElement>(null);

  // Text entrance — once, never on hover; reduced motion / no JS: simply shown.
  useEffect(() => {
    const root = section.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.dataset.motion = "";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        items.forEach((el) => (el.dataset.in = ""));
        io.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 },
    );
    io.observe(root.querySelector(".zorx-contact-frame")!);
    return () => {
      io.disconnect();
      delete root.dataset.motion;
      items.forEach((el) => delete el.dataset.in);
    };
  }, []);

  return (
    <section ref={section} className={`zorx-contact ${servicesFont.variable}`} aria-labelledby="zorx-contact-title">
      <div className="zorx-contact-frame">
        <PerchedBirds birds={CONTACT_BIRDS} />
        <h2 id="zorx-contact-title" className="zorx-contact-title" data-reveal="">
          Interested in working together?
        </h2>
        <div className="zorx-contact-cta-wrap" data-reveal="">
          {CONTACT_HREF && /^https?:/.test(CONTACT_HREF) ? (
            // external (e.g. WhatsApp): a new tab, so the site stays open behind it
            <a href={CONTACT_HREF} target="_blank" rel="noopener noreferrer" className="zorx-cta zorx-cta-primary zorx-contact-cta">
              Let&apos;s Talk
              <span className="sr-only">
                {/^https:\/\/wa\.me\//.test(CONTACT_HREF) ? " — chat on WhatsApp" : ""} (opens in a new tab)
              </span>
            </a>
          ) : CONTACT_HREF ? (
            <Link href={CONTACT_HREF} className="zorx-cta zorx-cta-primary zorx-contact-cta">
              Let&apos;s Talk
            </Link>
          ) : (
            // No contact destination yet: shown as designed, not a dead link.
            <span className="zorx-cta zorx-cta-primary zorx-contact-cta" data-static="">
              Let&apos;s Talk
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The males' clip and the female, both scaled to the same bird height and set
 * so the row their feet grip lies exactly on the top border (ContactSection.css).
 * The clip is lazy: no source until the section is near; it plays only while
 * on screen and is never restarted by interaction. Reduced motion: its poster.
 */
function PerchedBirds({ birds }: { birds: ContactBirds }) {
  const video = useRef<HTMLVideoElement>(null);
  const { males, female } = birds;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // poster only
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      v.src = prefersHevcAlpha() ? males.hevc : males.webm; // HEVC alpha on Safari / iOS, VP9 alpha elsewhere
      v.preload = "auto";
    };
    const near = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && load(), {
      rootMargin: "600px 0px",
    });
    const onScreen = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (e.isIntersecting) {
        load();
        v.play().catch(() => {});
      } else v.pause();
    });
    near.observe(v);
    onScreen.observe(v);
    return () => {
      near.disconnect();
      onScreen.disconnect();
      v.pause();
    };
  }, [males]);

  const style = {
    "--mw": males.width,
    "--mh": males.height,
    "--mp": males.perchY,
    "--mc": males.crownY,
    "--mx": (males.x0 + males.x1) / 2,
    "--fw": female.width,
    "--fh": female.height,
    "--fp": female.perchY,
    "--fc": female.crownY,
    "--fx": female.feetX,
  } as CSSProperties;
  return (
    <div className="zorx-contact-birds" style={style} aria-hidden="true">
      <div className="zorx-contact-males">
        <video
          ref={video}
          className="zorx-contact-birds-video"
          poster={males.poster}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
        />
      </div>
      <div className="zorx-contact-female">
        <Image
          src={female.src}
          alt=""
          width={female.width}
          height={female.height}
          sizes="(max-width: 640px) 12vw, (max-width: 1900px) 9vw, 170px"
          draggable={false}
        />
        {female.motion && <FemaleBird clip={female.motion} male={video} />}
      </div>
    </div>
  );
}

type FemaleState = "resting" | "idle-reaction" | "cta-reaction" | "paused";

/**
 * The female Manakin: one transparent clip laid exactly over its own first
 * frame (the poster, her resting pose), driven by ONE controller — the only
 * thing that ever plays, pauses or seeks this video.
 *
 *  resting        paused on the rest frame; after a random rest (FEMALE_TUNING
 *                 .restMs) the next courtship burst of the males (maleCues, read
 *                 from the males' own playback time) starts a look-around
 *  idle-reaction  plays clip.watch, then back to the rest frame
 *  cta-reaction   LET'S TALK hovered / tapped / focused: plays clip.react — the
 *                 crouch and wing flap — whose end dissolves into the rest pose.
 *                 Once per entry, never overlapping (cooldown); a look-around
 *                 near its end runs straight on into it
 *  paused         off screen or the tab hidden (resumes where it was)
 *
 * Priority: off screen / reduced motion > LET'S TALK > the males' cues > rest.
 * Lazy (no source until the section is near), one format (prefersHevcAlpha),
 * the end of a range is caught per decoded frame (requestVideoFrameCallback;
 * timeupdate where unsupported). Reduced motion or a playback error: the poster
 * stays — the same pose, place and size.
 */
function FemaleBird({ clip, male }: { clip: FemaleClip; male: RefObject<HTMLVideoElement | null> }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const males = male.current;
    const cta = v.closest(".zorx-contact-frame")?.querySelector<HTMLElement>(".zorx-contact-cta") ?? null;

    const el = v; // non-null for the hoisted helpers below
    let state: FemaleState = "resting";
    let hiddenFrom: FemaleState | null = null; // what was playing when it went off screen
    const set = (next: FemaleState) => {
      state = next;
      el.dataset.state = next;
    };
    let loaded = false, ready = false, onScreen = false, broken = false;
    let end = 0; // end of the range being played (s)
    let restUntil = 0; // performance.now() before which no look-around starts
    let ctaAt = -Infinity; // last LET'S TALK reaction start
    let pendingCta = false; // asked for before the clip could play
    let frameCb = 0;
    let lastMaleT = -1;
    const now = () => performance.now();
    const rest = () => (restUntil = now() + FT.restMs[0] + Math.random() * (FT.restMs[1] - FT.restMs[0]));
    const visible = () => onScreen && !document.hidden;

    const load = () => {
      if (loaded) return;
      loaded = true;
      v.src = prefersHevcAlpha() ? clip.hevc : clip.webm; // one format only
      v.preload = "auto";
    };

    // ---------------------------------------------------- end-of-range watcher
    const stopWatch = () => {
      if (frameCb && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(frameCb);
      frameCb = 0;
      v.removeEventListener("timeupdate", onTime);
    };
    const reached = (t: number) => t >= end - 0.03;
    const onFrame = (_: number, meta: VideoFrameCallbackMetadata) => {
      frameCb = 0;
      if (reached(meta.mediaTime)) finish();
      else frameCb = v.requestVideoFrameCallback(onFrame);
    };
    function onTime() {
      if (reached(el.currentTime)) finish();
    }
    const watch = () => {
      stopWatch();
      if (v.requestVideoFrameCallback) frameCb = v.requestVideoFrameCallback(onFrame);
      else v.addEventListener("timeupdate", onTime);
    };

    // ---------------------------------------------------- playback
    const play = (from: number, to: number, next: FemaleState) => {
      set(next);
      end = to;
      if (Math.abs(v.currentTime - from) > 0.02) v.currentTime = from;
      if (visible()) {
        v.play().catch(() => {});
        watch();
      }
    };
    /** A range has ended: back to the rest frame (the react range already flows into it). */
    function finish() {
      stopWatch();
      el.pause();
      el.currentTime = clip.rest;
      set("resting");
      rest();
    }

    // ---------------------------------------------------- LET'S TALK
    const react = () => {
      if (broken) return;
      if (!ready) {
        pendingCta = true;
        load();
        return;
      }
      if (state === "cta-reaction" || now() - ctaAt < FT.ctaCooldownMs) return; // once, no overlap
      ctaAt = now();
      if (state === "idle-reaction" && v.currentTime >= clip.watch[1] - FT.ctaJoinS) {
        set("cta-reaction"); // runs on into the flap: continuous footage
        end = clip.react[1];
        return;
      }
      play(clip.react[0], clip.react[1], "cta-reaction");
    };
    const onCtaPointer = (e: PointerEvent) => {
      if (e.type === "pointerenter" && e.pointerType !== "mouse") return; // touch: pointerdown only
      if (e.type === "pointerdown" && e.pointerType === "mouse") return; // mouse: the hover already did
      react(); // never delays the link: no preventDefault
    };
    const onCtaFocus = () => cta?.matches(":focus-visible") && react();

    // ---------------------------------------------------- the males' dance
    const onMaleTime = () => {
      if (!males) return;
      const t = males.currentTime;
      const prev = lastMaleT;
      lastMaleT = t;
      if (prev < 0 || state !== "resting" || !ready || !visible() || now() < restUntil) return;
      const crossed = FT.maleCues.some((c) => (t >= prev ? prev < c && c <= t : prev < c || c <= t)); // loop wrap
      if (crossed) play(clip.watch[0], clip.watch[1], "idle-reaction");
    };

    // ---------------------------------------------------- visibility
    const sync = () => {
      if (visible()) {
        load();
        if (hiddenFrom) {
          set(hiddenFrom); // carries on from where it was
          hiddenFrom = null;
          v.play().catch(() => {});
          watch();
        }
      } else if (state === "idle-reaction" || state === "cta-reaction") {
        hiddenFrom = state;
        v.pause();
        stopWatch();
        set("paused");
      }
    };
    const onReady = () => {
      if (ready) return;
      ready = true;
      v.dataset.playing = ""; // shows the clip — its first frame IS the poster
      el.parentElement?.setAttribute("data-video", ""); // …which now hides, so a moving bird never shows it through
      rest();
      if (pendingCta) {
        pendingCta = false;
        react();
      }
    };
    const onError = () => {
      broken = true;
      stopWatch();
      delete v.dataset.playing; // the poster again: same pose, place and size
      el.parentElement?.removeAttribute("data-video");
    };

    const near = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && load(), {
      rootMargin: "600px 0px",
    });
    const seen = new IntersectionObserver((es) => {
      onScreen = es[es.length - 1].isIntersecting;
      sync();
    });
    // the react range ends with the clip itself: its last frame is earlier than
    // the duration, so "ended" is the reliable end there
    const onEnded = () => (state === "idle-reaction" || state === "cta-reaction") && finish();
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    document.addEventListener("visibilitychange", sync);
    males?.addEventListener("timeupdate", onMaleTime);
    cta?.addEventListener("pointerenter", onCtaPointer);
    cta?.addEventListener("pointerdown", onCtaPointer);
    cta?.addEventListener("focus", onCtaFocus);
    near.observe(v);
    seen.observe(v);
    return () => {
      near.disconnect();
      seen.disconnect();
      stopWatch();
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", sync);
      males?.removeEventListener("timeupdate", onMaleTime);
      cta?.removeEventListener("pointerenter", onCtaPointer);
      cta?.removeEventListener("pointerdown", onCtaPointer);
      cta?.removeEventListener("focus", onCtaFocus);
      v.pause();
      el.parentElement?.removeAttribute("data-video");
    };
  }, [clip, male]);

  return (
    <video
      ref={video}
      className="zorx-contact-female-video"
      data-state="resting"
      muted
      playsInline
      preload="none"
      disablePictureInPicture
    />
  );
}
