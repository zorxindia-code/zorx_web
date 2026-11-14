"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ASSETS, TUNING } from "@/config/brand";
import { computeLayout, type StageLayout } from "@/lib/zorx/layout";
import { createBirdController, waitForEssentials } from "@/lib/zorx/media";
import { buildScrollExperience, setInitialState, type Rig } from "@/lib/zorx/timelines";
import { Preloader } from "./Preloader";
import { ZorxLogoReveal } from "./ZorxLogoReveal";
import { ShowreelSection } from "./ShowreelSection";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The ZORX experience: one pinned stage, one scrubbed timeline. No React state —
 * the component renders once; GSAP drives everything through refs.
 *
 *   01  Loading (automatic, ≤ 2 s)  pure white, original bird video flapping
 *   02  scroll                      bird grows (still flapping); white contracts to the O
 *   03  scroll                      bird settles and becomes the O (o.png)
 *   04  scroll                      Z from the left + X from the right, identical motion
 *   05  scroll                      INTERACTIVE AGENCY (one text element)
 *   06  scroll                      logo → Z | showreel | X
 *
 * After loading nothing moves on its own; the user's scroll drives every frame.
 */
export default function ZorxExperience() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const z = useRef<HTMLDivElement>(null);
  const x = useRef<HTMLDivElement>(null);
  const tagline = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const loader = useRef<HTMLVideoElement>(null);
  const reel = useRef<HTMLDivElement>(null);
  const reelVideo = useRef<HTMLVideoElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const stageEl = stage.current!;
      const loaderEl = loader.current!;
      const reelEl = reel.current!;
      const reelVid = reelVideo.current!;
      const html = document.documentElement;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      html.classList.add("zorx-locked");
      ScrollTrigger.config({ ignoreMobileResize: true });

      const measure = () => computeLayout(stageEl.clientWidth, stageEl.clientHeight);
      let L: StageLayout = measure();
      const base = { art: 1, square: 1, video: 1 };

      // Showreel buffering indicator — attribute toggles only, no re-renders.
      const setReelLoading = (on: boolean) => (reelEl.dataset.loading = on ? "true" : "false");
      const onReelPlaying = () => setReelLoading(false);
      const onReelWaiting = () => setReelLoading(true);
      reelVid.addEventListener("playing", onReelPlaying);
      reelVid.addEventListener("waiting", onReelWaiting);

      const rig: Rig = {
        stage: stageEl,
        frame: frame.current!,
        art: art.current!,
        loader: loaderEl,
        bird: createBirdController(loaderEl, ASSETS.loaderDuration, reduce),
        z: z.current!,
        x: x.current!,
        tagline: tagline.current!,
        hint: hint.current!,
        reel: reelEl,
        reelVideo: reelVid,
        L: () => L,
        base: () => base,
        // Lazy: the showreel gets its poster and permission to buffer only now.
        onReelApproach: () => {
          if (reelVid.dataset.poster) reelVid.poster = reelVid.dataset.poster;
          reelVid.preload = "auto";
          reelEl.dataset.active = "";
        },
        reduce,
      };

      /** Static sizes, set once per layout. Elements are laid out at their largest state and scaled down. */
      const applyLayout = () => {
        base.art = Math.max(L.logo.art.w, L.comp.art.w);
        base.square = Math.max(L.logo.z.w, L.comp.z.w);
        base.video = L.logo.video.w;
        gsap.set(rig.art, { width: base.art, height: base.art });
        gsap.set([rig.z, rig.x], { width: base.square, height: base.square });
        // CSS showed the same small icon before hydration, so this is invisible.
        gsap.set(rig.loader, { left: 0, top: 0, width: base.video, height: base.video });
        const t = L.logo.tagline;
        gsap.set(rig.tagline, { x: t.x, y: t.y, width: t.w, height: t.h });
        const f = L.comp.frame;
        gsap.set(rig.reel, { x: f.x, y: f.y, width: f.w, height: f.h });
      };

      applyLayout();
      setInitialState(rig);
      gsap.set([rig.art, rig.z, rig.x, rig.tagline, rig.hint, rig.reel], { autoAlpha: 0 });

      // ------------------------------------------------ 01 · loading (~2 s)
      let alive = true;
      let scrollTl: gsap.core.Timeline | null = null;
      const essentials = waitForEssentials(
        loaderEl,
        Array.from(stageEl.querySelectorAll<HTMLImageElement>(".zorx-art img, .zorx-square img")),
        TUNING.loadingMinMs,
        TUNING.loadingMaxMs,
      );

      // ------------------------------------------------ B–D · scroll
      // Loading ends by handing control to the user — nothing advances by itself.
      essentials.promise
        .then(
          contextSafe!(() => {
            if (!alive) return;
            html.classList.remove("zorx-locked");
            scrollTl = buildScrollExperience(rig);
            stageEl.dataset.ready = ""; // fades the scroll indicator in (CSS)
          }),
        )
        .catch(() => {});

      // ------------------------------------------------ resize
      let lastW = stageEl.clientWidth;
      let timer = 0;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const onResize = contextSafe!(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const w = stageEl.clientWidth;
          if (coarse && w === lastW && Math.abs(stageEl.clientHeight - L.H) < L.H * 0.18) return; // URL bar
          lastW = w;
          L = measure();
          applyLayout();
          if (scrollTl) ScrollTrigger.refresh();
          else setInitialState(rig);
        }, 120);
      });
      window.addEventListener("resize", onResize);

      return () => {
        alive = false;
        essentials.cancel();
        window.clearTimeout(timer);
        window.removeEventListener("resize", onResize);
        reelVid.removeEventListener("playing", onReelPlaying);
        reelVid.removeEventListener("waiting", onReelWaiting);
        reelVid.pause();
        rig.bird.dispose();
        html.classList.remove("zorx-locked");
      };
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <h1 className="sr-only">ZORX</h1>

      {/* The one pinned section. ScrollTrigger adds the scroll distance (pin spacing). */}
      <section ref={stage} className="zorx-stage" aria-label="ZORX showreel">
        <ZorxLogoReveal frameRef={frame} artRef={art} zRef={z} xRef={x} taglineRef={tagline} />
        <Preloader videoRef={loader} />
        <ShowreelSection reelRef={reel} videoRef={reelVideo} />
        <div ref={hint} className="zorx-hint" aria-hidden="true">
          <div className="zorx-hint-inner">
            <span className="zorx-mouse">
              <span className="zorx-mouse-wheel" />
            </span>
            <span className="zorx-hint-text">Scroll to explore</span>
          </div>
        </div>
      </section>

      <noscript>
        <style>{`.zorx-stage{display:none}html.zorx-locked{overflow:auto}`}</style>
        <div className="grid min-h-svh place-items-center bg-black p-8">
          <Image
            src={ASSETS.logoWhite}
            alt="ZORX — Interactive Agency"
            width={1920}
            height={800}
            unoptimized
            className="h-auto w-full max-w-xl"
          />
        </div>
      </noscript>
    </div>
  );
}
