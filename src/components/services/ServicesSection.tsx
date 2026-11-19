"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SERVICES, SERVICES_TUNING as T, type BirdClip, type ClipSources } from "@/config/services";
import { placeBird } from "@/lib/services/placement";
import { createGrip } from "@/lib/services/grip";
import { prefersHevcAlpha } from "@/lib/videoSupport";
import { BirdAnimation } from "./BirdAnimation";
import { ServiceRow } from "./ServiceRow";
import { servicesFont } from "./font";

type Phase = "idle" | "entering" | "perched" | "exiting";

/**
 * Editorial services selector. Hover (or tap) highlights a row immediately;
 * after an intentional delay its bird flies in and perches on the divider below
 * it; when the row is left, the bird takes off and flies out.
 *
 * One central controller, no React state:
 *  - input only sets which bird is WANTED (`want`)
 *  - the bird state machine (idle → entering → perched → exiting → idle) acts
 *    only when it is settled, so there is never more than one bird, a flight is
 *    never cut short, and an old exit can't collide with a new entrance.
 */
export default function ServicesSection() {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = section.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hevc = prefersHevcAlpha();
    const rows = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("[data-service]").forEach((r) => rows.set(r.dataset.service!, r));
    const order = SERVICES.map((s) => s.id);
    const clipOf = (id: string | null) => (id ? (SERVICES.find((s) => s.id === id)?.bird ?? null) : null);
    const src = (c: ClipSources) => (hevc ? c.hevc : c.webm);

    // ---------------------------------------------------------- state
    let active: string | null = null; // highlighted row (input)
    let lingering: string | null = null; // row kept bold while its bird flies off
    let want: string | null = null; // bird that should be out
    let phase: Phase = "idle";
    let current: string | null = null; // bird that is out
    let timer = 0;

    // One enter/exit video pair per bird (see BirdAnimation).
    const pairs = new Map<string, { enter: HTMLVideoElement; exit: HTMLVideoElement }>();
    root.querySelectorAll<HTMLVideoElement>("video[data-bird]").forEach((v) => {
      const id = v.dataset.bird!;
      const pair = pairs.get(id) ?? ({} as { enter: HTMLVideoElement; exit: HTMLVideoElement });
      pair[v.dataset.role as "enter" | "exit"] = v;
      pairs.set(id, pair);
    });
    const allVideos = [...pairs.values()].flatMap((p) => [p.enter, p.exit]);
    const P = (id: string) => pairs.get(id)!;
    gsap.set(allVideos, { autoAlpha: 0 });

    // Grip lines: the divider redrawn over a bird's own tail and cut away behind
    // its toes, frame by frame (BirdGrip, lib/services/grip). place() sizes it.
    const grips = new Map<string, { el: HTMLElement; ctl: ReturnType<typeof createGrip> }>();
    root.querySelectorAll<HTMLElement>("[data-grip]").forEach((el) => {
      const grip = clipOf(el.dataset.grip!)?.grip;
      if (grip) grips.set(el.dataset.grip!, { el, ctl: createGrip(el, grip) });
    });
    const gripOf = (id: string | null) => (id ? (grips.get(id) ?? null) : null);

    // ---------------------------------------------------------- bird helpers
    /** First use of a bird: give its pair sources (fetched once, kept buffered). */
    const load = (clip: BirdClip) => {
      const { enter } = P(clip.id);
      if (enter.dataset.loaded) return;
      enter.dataset.loaded = "1";
      enter.src = src(clip.enter);
      enter.preload = "auto";
      // The entrance gets the whole connection first; the take-off clip follows
      // once it is in (or as soon as it is needed — see loadExit in startExit).
      onFull(enter, () => loadExit(clip));
    };
    const loadExit = (clip: BirdClip) => {
      const { exit } = P(clip.id);
      if (!clip.exit || exit.dataset.loaded) return;
      exit.dataset.loaded = "1";
      exit.src = src(clip.exit);
      exit.preload = "auto";
    };

    /** The clip is downloaded to its end (and playable). */
    const isFull = (v: HTMLVideoElement) =>
      v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
      Number.isFinite(v.duration) &&
      v.buffered.length > 0 &&
      v.buffered.end(v.buffered.length - 1) >= v.duration - 0.05;
    const FULL_EVENTS = ["progress", "canplaythrough", "loadeddata"] as const;
    /** Run `cb` once the clip is fully downloaded (or after `timeoutMs`). Returns a canceller. */
    const onFull = (v: HTMLVideoElement, cb: () => void, timeoutMs = 0) => {
      let done = false;
      const stop = () => {
        done = true;
        FULL_EVENTS.forEach((e) => v.removeEventListener(e, check));
        window.clearTimeout(t);
      };
      const go = () => {
        if (done) return;
        stop();
        cb();
      };
      const check = () => isFull(v) && go();
      const t = timeoutMs ? window.setTimeout(go, timeoutMs) : 0;
      if (isFull(v)) go();
      else FULL_EVENTS.forEach((e) => v.addEventListener(e, check));
      return stop;
    };

    const place = (id: string) => {
      const clip = clipOf(id);
      const row = rows.get(id);
      if (!clip || !row) return;
      const next = rows.get(order[order.indexOf(id) + 1] ?? "");
      const sec = root.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const text = (el?: HTMLElement) => {
        const b = el?.querySelector(".zorx-service-label")?.getBoundingClientRect();
        return b ? { l: b.left - sec.left, r: b.right - sec.left } : { l: sec.width, r: 0 };
      };
      const t = text(row);
      const n = text(next);
      // Centre of the 1px divider below the row: the next row's top border, or
      // for the last row its own bottom border.
      const dividerY = next ? r.bottom - sec.top + 0.5 : r.bottom - sec.top - 0.5;
      const p = placeBird(
        clip.meta,
        {
          width: sec.width,
          dividerY,
          rowHeight: r.height,
          textLeft: t.l,
          textRight: t.r,
          nextTextLeft: n.l,
          nextTextRight: n.r,
          // Last row: the tail hangs into the bottom padding; keep it inside the
          // section (which clips), with a little air.
          floorY: next ? undefined : sec.height - 8,
        },
        clip.side,
        clip.size,
        clip.grip?.perchY,
      );
      const { enter, exit } = P(id);
      gsap.set([enter, exit], { x: p.x, y: p.y, scale: p.scale, width: clip.meta.width, height: clip.meta.height });
      const g = gripOf(id)?.el;
      if (g && clip.grip) {
        // left/top (not a transform): the 1px line snaps to the divider's own pixel row
        const [s0, s1] = clip.grip.span;
        g.style.left = `${p.x + s0 * p.scale}px`;
        g.style.top = `${dividerY - 0.5}px`;
        g.style.width = `${(s1 - s0) * p.scale}px`;
      }
    };

    /** Flight speed. Set right before each play: loading a source resets the rate. */
    const speed = (v: HTMLVideoElement) => {
      v.defaultPlaybackRate = T.playbackRate;
      v.playbackRate = T.playbackRate;
    };

    /**
     * Run `cb` once the video has a NEW frame on screen — after a seek or a play
     * start. Showing a video before that can flash the frame it last held (a
     * perched bird before its entrance), or nothing at all if it isn't decoded yet.
     */
    const onFrame = (v: HTMLVideoElement, cb: () => void) => {
      // (typed as always present, but older browsers lack it → "playing" fallback)
      const rvfc = (v as Partial<Pick<HTMLVideoElement, "requestVideoFrameCallback">>).requestVideoFrameCallback;
      if (rvfc) rvfc.call(v, () => cb());
      else v.addEventListener("playing", () => cb(), { once: true });
    };
    /**
     * Run `cb` once the clip can play to its end without stalling (or after a
     * safety timeout). A flight that starts before that freezes mid-air on slow
     * connections; waiting just means the bird sets off a moment later.
     * Stale calls (another flight started since) are dropped via `token`.
     */
    const whenReady = (v: HTMLVideoElement, token: number, cb: () => void) => {
      // "canplaythrough" is only the browser's estimate (Chrome fires it early on
      // slow links), so wait for the clip to be downloaded to its end. The clips
      // are small and start buffering during the hover delay.
      onFull(v, () => token === seq && cb(), T.readyTimeoutMs);
    };
    /** Rewind (only if needed — a redundant seek can blank a frame in Safari). */
    const rewind = (v: HTMLVideoElement) => {
      if (v.currentTime > 0.001) v.currentTime = 0;
    };
    /** Bumped whenever a flight starts or the section unmounts: stale callbacks bail. */
    let seq = 0;
    /** The entering bird is actually on screen yet (its first frame has painted). */
    let shown = false;

    /** Visible-but-transparent: Firefox only decodes videos it considers visible. */
    const stage = (v: HTMLVideoElement) => gsap.set(v, { visibility: "visible", opacity: 0 });

    const setRow = (id: string | null, on: boolean) => {
      const row = id ? rows.get(id) : null;
      if (!row) return;
      if (on) row.dataset.active = "";
      else delete row.dataset.active;
      row.querySelector("button")?.setAttribute("aria-pressed", String(on));
    };

    // ---------------------------------------------------------- state machine
    function reconcile() {
      // An entrance that hasn't painted its first frame yet (still loading) is
      // simply cancelled if that bird is no longer wanted — nothing was seen.
      if (phase === "entering" && !shown && want !== current) return cancelEnter();
      if (phase === "entering" || phase === "exiting") return; // let the flight finish
      if (phase === "perched" && want !== current) return startExit();
      if (phase === "idle" && want) startEnter(want);
    }

    function startEnter(id: string) {
      const clip = clipOf(id)!;
      const { enter: enterV, exit: exitV } = P(id);
      load(clip);
      place(id);
      current = id;
      phase = "entering";
      shown = false;
      const token = ++seq;
      const grip = gripOf(id);
      gsap.killTweensOf([enterV, exitV]);
      if (grip) {
        gsap.killTweensOf(grip.el);
        grip.ctl.hide();
      }
      if (clip.exit) {
        stage(exitV);
        rewind(exitV); // first take-off frame ready for the hand-off
      }
      stage(enterV); // decoding, but transparent until its first frame paints
      if (reduce) {
        enterV.currentTime = Math.max(0, clip.meta.duration - 0.05);
        const show = () => {
          if (token !== seq) return;
          shown = true;
          gsap.to(enterV, { autoAlpha: 1, duration: 0.4, onComplete: onEntered });
          if (grip) {
            grip.ctl.hold("enter", grip.ctl.last("enter")); // perched pose
            gsap.fromTo(grip.el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
          }
        };
        if (enterV.seeking) enterV.addEventListener("seeked", show, { once: true });
        else show();
        return;
      }
      rewind(enterV);
      whenReady(enterV, token, () => {
        if (phase !== "entering" || current !== id) return;
        speed(enterV);
        onFrame(enterV, () => {
          if (token !== seq || phase !== "entering" || current !== id) return;
          shown = true;
          gsap.set(enterV, { autoAlpha: 1 });
          // The divider follows the landing frame by frame: in front of the
          // train as the bird comes down, behind each toe as it grips.
          grip?.ctl.follow(enterV, "enter");
        });
        enterV.play().catch(() => {});
      });
    }

    function cancelEnter() {
      const { enter: enterV, exit: exitV } = P(current!);
      const grip = gripOf(current);
      seq++;
      enterV.pause();
      gsap.killTweensOf([enterV, exitV]);
      gsap.set([enterV, exitV], { autoAlpha: 0 });
      if (grip) {
        gsap.killTweensOf(grip.el);
        grip.ctl.hide();
      }
      rewind(enterV);
      if (lingering === current) {
        setRow(lingering, false);
        lingering = null;
      }
      current = null;
      phase = "idle";
      reconcile();
    }

    function onEntered() {
      if (phase !== "entering") return;
      phase = "perched";
      const grip = gripOf(current);
      if (grip && !reduce) grip.ctl.hold("enter", grip.ctl.last("enter")); // perched: the resting grip
      reconcile();
    }

    function startExit() {
      const clip = clipOf(current);
      const { enter: enterV, exit: exitV } = P(current!);
      const grip = gripOf(current);
      phase = "exiting";
      gsap.killTweensOf([enterV, exitV]);
      if (!clip?.exit || reduce) {
        gsap.to(enterV, { autoAlpha: 0, duration: T.fade, ease: "power1.out", onComplete: onExited });
        if (grip) gsap.to(grip.el, { opacity: 0, duration: T.fade, ease: "power1.out" });
        return;
      }
      // Take-off: the first exit frame is the same perched pose. The perched bird
      // stays fully visible until the exit's first frame has actually painted —
      // only then do they cross over, so the bird can never blink out.
      const token = ++seq;
      loadExit(clip); // normally already in; needed now if the visit was short
      stage(exitV);
      rewind(exitV);
      // The bird stays perched until its take-off clip can play through.
      whenReady(exitV, token, () => takeOff(token));
    }

    function takeOff(token: number) {
      const { enter: enterV, exit: exitV } = P(current!);
      const grip = gripOf(current);
      speed(exitV);
      onFrame(exitV, () => {
        if (token !== seq || phase !== "exiting") return;
        gsap.to(exitV, { opacity: 1, duration: T.handoff, ease: "none" });
        // The divider follows the take-off frame by frame: behind the toes until
        // they push off it, then back behind the departing bird.
        grip?.ctl.follow(exitV, "exit");
        gsap.to(enterV, { autoAlpha: 0, duration: T.handoff, ease: "none", delay: T.handoff * 0.5 });
        // Last moments of the flight: fade, so nothing can linger at a clip edge
        // (timed from now, the real start, in real time at the playback rate).
        if (Number.isFinite(exitV.duration)) {
          const left = (exitV.duration - exitV.currentTime) / T.playbackRate;
          gsap.to(exitV, {
            opacity: 0,
            duration: T.exitTailFade,
            ease: "none",
            delay: Math.max(T.handoff, left - T.exitTailFade),
          });
        }
      });
      exitV.play().catch(() => onExited());
    }

    function onExited() {
      if (phase !== "exiting") return;
      const { enter: enterV, exit: exitV } = P(current!);
      const grip = gripOf(current);
      gsap.killTweensOf([enterV, exitV]);
      gsap.set([enterV, exitV], { autoAlpha: 0 });
      if (grip) {
        gsap.killTweensOf(grip.el);
        grip.ctl.hide();
      }
      enterV.pause();
      exitV.pause();
      // Rewind both while hidden, so the next visit starts on frame 0 at once.
      rewind(enterV);
      rewind(exitV);
      if (lingering === current) {
        setRow(lingering, false); // typography returns once the bird has left
        lingering = null;
      }
      current = null;
      phase = "idle";
      reconcile();
    }

    // A clip's end only counts if it belongs to the bird that is out.
    const onEnded = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      if (v.dataset.bird !== current) return;
      if (v.dataset.role === "enter") onEntered();
      else onExited();
    };
    allVideos.forEach((v) => v.addEventListener("ended", onEnded));

    // ---------------------------------------------------------- input → want
    const activate = (id: string, delay: number) => {
      if (active === id) return;
      window.clearTimeout(timer);
      // Switching rows: the previous row (and any lingering one) returns at once.
      if (active) setRow(active, false);
      if (lingering && lingering !== id) setRow(lingering, false);
      lingering = null;
      active = id;
      setRow(id, true); // typography responds immediately
      if (want !== id) want = null; // a different row's bird should leave now
      reconcile();
      const clip = clipOf(id);
      if (!clip) return;
      if (current !== id) {
        load(clip); // buffer during the intent delay
        place(id);
        stage(P(id).enter);
      }
      timer = window.setTimeout(() => {
        if (active !== id) return;
        want = id;
        reconcile();
      }, delay);
    };

    const deactivate = () => {
      window.clearTimeout(timer);
      if (!active) return;
      const id = active;
      active = null;
      want = null;
      // Keep the row bold while its bird is out; otherwise return immediately.
      if (current === id && phase !== "idle") lingering = id;
      else setRow(id, false);
      reconcile();
      const pair = pairs.get(id);
      if (pair && current !== id) gsap.set(pair.enter, { autoAlpha: 0 }); // un-stage
    };

    let lastPointer = "mouse";
    const onPointerDown = (e: PointerEvent) => (lastPointer = e.pointerType);
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      activate((e.currentTarget as HTMLElement).dataset.service!, T.hoverDelayMs);
    };
    const onLeaveSection = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") deactivate();
    };
    const onClick = (e: MouseEvent) => {
      if (lastPointer === "mouse" || lastPointer === "pen") return; // hover handles mice
      const id = (e.currentTarget as HTMLElement).dataset.service!;
      if (active === id) deactivate(); // tap the active row again → bird takes off
      else activate(id, T.tapDelayMs);
    };
    const onFocus = (e: FocusEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-service]");
      if (row && lastPointer !== "touch") activate(row.dataset.service!, T.hoverDelayMs);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node)) deactivate();
    };
    const onDocDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !root.contains(e.target as Node)) deactivate(); // tap outside
    };
    const onResize = () => current && place(current);

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointerleave", onLeaveSection);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onDocDown);
    window.addEventListener("resize", onResize);
    rows.forEach((r) => {
      r.addEventListener("pointerenter", onEnter);
      r.addEventListener("click", onClick);
    });

    // ---------------------------------------------------------- media lifecycle
    // Once used, the eight alpha clips stay decoded and buffered (≈ 27 MB of
    // renderer memory, measured in Chrome). Far from the section (1.5 screens
    // away) for 10 s with no bird out, they are given back: sources dropped, the
    // loaded flags cleared, so the next use loads them again exactly as the first
    // time did (normally from the HTTP cache). Hysteresis: nothing is released
    // during ordinary scrolling past, and never a clip that is still loading.
    let releaseTimer = 0;
    const release = () => {
      if (phase !== "idle" || want || current) return;
      for (const v of allVideos) {
        if (!v.dataset.loaded || !isFull(v)) continue;
        v.pause();
        v.removeAttribute("src");
        v.load(); // drops the decoder and the buffered data
        delete v.dataset.loaded;
      }
    };
    const far = new IntersectionObserver(
      (es) => {
        window.clearTimeout(releaseTimer);
        if (!es[es.length - 1].isIntersecting) releaseTimer = window.setTimeout(release, 10_000);
      },
      { rootMargin: "150% 0px" },
    );
    far.observe(root);

    return () => {
      seq++;
      window.clearTimeout(timer);
      window.clearTimeout(releaseTimer);
      far.disconnect();
      gsap.killTweensOf([...allVideos, ...[...grips.values()].map((g) => g.el)]);
      grips.forEach((g) => g.ctl.hide());
      allVideos.forEach((v) => {
        v.pause();
        v.removeEventListener("ended", onEnded);
      });
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerleave", onLeaveSection);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onDocDown);
      window.removeEventListener("resize", onResize);
      rows.forEach((r) => {
        r.removeEventListener("pointerenter", onEnter);
        r.removeEventListener("click", onClick);
      });
    };
  }, []);

  return (
    <section
      ref={section}
      className={`zorx-services ${servicesFont.variable}`}
      aria-labelledby="zorx-services-title"
    >
      <h2 id="zorx-services-title" className="sr-only">
        Services
      </h2>
      <ul className="zorx-services-list">
        {SERVICES.map((s) => (
          <ServiceRow key={s.id} service={s} />
        ))}
      </ul>
      <BirdAnimation birds={SERVICES.flatMap((s) => (s.bird ? [s.bird] : []))} />
    </section>
  );
}
